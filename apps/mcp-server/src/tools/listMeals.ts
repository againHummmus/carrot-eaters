import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zonedPeriodRangeUtc, zonedDateKey } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { fetchProfile } from './profile.js';
import { macroLine } from '../format.js';
import { dateSchema } from '../schemas.js';

export function registerListMealsTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'list_meals',
    {
      description:
        'Lists the meals in a period (today by default) together with their meal_id. ' +
        'Call this before update_meal or delete_meal — they take a meal_id rather than a title, ' +
        'and without list_meals you have no way to know it.',
      inputSchema: {
        from: dateSchema.optional().describe('Start of the period, YYYY-MM-DD. Defaults to today'),
        to: dateSchema.optional().describe('End of the period, YYYY-MM-DD, inclusive. Defaults to the same day as from'),
      },
    },
    async ({ from, to }): Promise<CallToolResult> => {
      const profile = await fetchProfile(ctx);
      const timezone = profile?.timezone ?? 'Europe/Belgrade';

      const fromDate = from ?? zonedDateKey(timezone, new Date());
      const toDate = to ?? fromDate;
      const { start, end } = zonedPeriodRangeUtc(timezone, fromDate, toDate);

      const { data, error } = await ctx.db
        .from('meals')
        .select('id, title, eaten_at, kcal, protein, fat, carbs')
        .eq('user_id', ctx.userId)
        .gte('eaten_at', start.toISOString())
        .lt('eaten_at', end.toISOString())
        .order('eaten_at', { ascending: true });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      if (rows.length === 0) {
        return {
          content: [{ type: 'text', text: `No meals logged for ${fromDate}${toDate !== fromDate ? ` — ${toDate}` : ''}.` }],
        };
      }

      const lines = rows.map((row) => {
        // Month as a word and a 24h clock: this listing is read back by a model, so "04 Sep, 14:30"
        // leaves no room for the dd/mm vs mm/dd ambiguity a numeric date would introduce.
        const time = new Date(row.eaten_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone,
        });
        return `${row.id} · ${time} · ${row.title} — ${macroLine(row.kcal, row.protein, row.fat, row.carbs)}`;
      });

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );
}
