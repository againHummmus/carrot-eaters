import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { sumNutrients, type Meal } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { fetchProfile, NO_PROFILE_HINT } from './profile.js';
import { todaySummaryLine } from './dailySummary.js';
import { macroLine } from '../format.js';

const mealItemSchema = z.object({
  name: z.string(),
  grams: z.number().optional(),
  kcal: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  fiber: z.number().describe('g, required — estimate it even roughly if unsure'),
  sugar: z.number().describe('g, required — estimate it even roughly if unsure'),
  saturated_fat: z.number().describe('g, required — estimate it even roughly if unsure'),
  cholesterol: z.number().describe('mg, required — estimate it even roughly if unsure'),
  sodium: z.number().describe('mg, required — estimate it even roughly if unsure'),
});

const UNIQUE_VIOLATION = '23505';

export function registerLogMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'log_meal',
    {
      description:
        'Logs a meal from already-calculated nutrients (you work them out from the photo or description; this tool only stores them). ' +
        'fiber/sugar/saturated_fat/cholesterol/sodium are required for every item — estimate them alongside the calories and macros, ' +
        'roughly if need be, but never leave them out. ' +
        'client_ref: reusing the same token on a retry will not create a duplicate. Returns more than "saved" — the running day total, what is left against the goal, and the meal_id.',
      inputSchema: {
        title: z.string().describe('Meal title, written in the language the user is speaking'),
        items: z.array(mealItemSchema).min(1).describe('The items this meal is made of'),
        eaten_at: z.string().datetime({ offset: true }).optional().describe('ISO datetime, defaults to now'),
        confidence: z.enum(['low', 'medium', 'high']).describe('How confident the nutrient estimate is'),
        client_ref: z.string().optional().describe('Idempotency key for retried calls'),
      },
    },
    async ({ title, items, eaten_at, confidence, client_ref }): Promise<CallToolResult> => {
      const profile = await fetchProfile(ctx);
      if (!profile) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
      }

      if (client_ref) {
        const { data: existing, error: findError } = await ctx.db
          .from('meals')
          .select('*')
          .eq('user_id', ctx.userId)
          .eq('client_ref', client_ref)
          .maybeSingle();
        if (findError) throw new Error(findError.message);
        if (existing) {
          const meal = existing as Meal;
          const summary = await todaySummaryLine(ctx, profile);
          return {
            content: [
              {
                type: 'text',
                text: `Already logged earlier: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)} (id: ${meal.id})\n${summary}`,
              },
            ],
          };
        }
      }

      const totals = sumNutrients(items);
      const insertMeal = async () =>
        ctx.db
          .from('meals')
          .insert({
            user_id: ctx.userId,
            title,
            eaten_at: eaten_at ?? new Date().toISOString(),
            confidence,
            client_ref: client_ref ?? null,
            ...totals,
          })
          .select('*')
          .single();

      let { data: meal, error } = await insertMeal();

      if (error && error.code === UNIQUE_VIOLATION && client_ref) {
        // Lost a race against a concurrent identical call — treat as idempotent success.
        const { data: existing, error: findError } = await ctx.db
          .from('meals')
          .select('*')
          .eq('user_id', ctx.userId)
          .eq('client_ref', client_ref)
          .single();
        if (findError) throw new Error(findError.message);
        meal = existing;
        error = null;
      }
      if (error) throw new Error(error.message);

      const itemRows = items.map((item) => ({ meal_id: (meal as Meal).id, ...item }));
      const { error: itemsError } = await ctx.db.from('meal_items').insert(itemRows);
      if (itemsError) throw new Error(itemsError.message);

      const summary = await todaySummaryLine(ctx, profile);
      return {
        content: [
          {
            type: 'text',
            text: `Logged: ${title} — ${macroLine(totals.kcal, totals.protein, totals.fat, totals.carbs)} (id: ${(meal as Meal).id})\n${summary}`,
          },
        ],
      };
    }
  );
}
