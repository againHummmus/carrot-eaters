import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { sumNutrients } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
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

export function registerUpdateMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'update_meal',
    {
      description:
        'Edits an already-logged meal: title, eaten_at and/or items (a complete replacement list — when given, ' +
        'the meal nutrients are recalculated from it from scratch). Pass only the fields you want to change. ' +
        'You do not know the meal_id up front — call list_meals first to find it.',
      inputSchema: {
        meal_id: z.string().uuid(),
        title: z.string().optional(),
        eaten_at: z.string().datetime({ offset: true }).optional(),
        items: z.array(mealItemSchema).min(1).optional(),
      },
    },
    async ({ meal_id, title, eaten_at, items }): Promise<CallToolResult> => {
      const { data: existing, error: findError } = await ctx.db
        .from('meals')
        .select('id')
        .eq('id', meal_id)
        .eq('user_id', ctx.userId)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!existing) {
        return { content: [{ type: 'text', text: 'Meal not found.' }], isError: true };
      }

      const update: Record<string, unknown> = {};
      if (title !== undefined) update.title = title;
      if (eaten_at !== undefined) update.eaten_at = eaten_at;

      if (items !== undefined) {
        const { error: deleteError } = await ctx.db.from('meal_items').delete().eq('meal_id', meal_id);
        if (deleteError) throw new Error(deleteError.message);

        const totals = sumNutrients(items);
        Object.assign(update, totals);

        const { error: insertError } = await ctx.db.from('meal_items').insert(items.map((item) => ({ meal_id, ...item })));
        if (insertError) throw new Error(insertError.message);
      }

      const { data: meal, error: updateError } = await ctx.db.from('meals').update(update).eq('id', meal_id).select('*').single();
      if (updateError) throw new Error(updateError.message);

      return {
        content: [
          {
            type: 'text',
            text: `Updated: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)}`,
          },
        ],
      };
    }
  );
}
