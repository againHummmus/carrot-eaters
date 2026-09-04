import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zonedPeriodRangeUtc, zonedDateKey } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { fetchProfile } from './profile.js';
import { macroLine } from '../format.js';
import { dateSchema } from '../schemas.js';

export function registerGetStatsTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'get_stats',
    {
      description:
        'Returns nutrient totals for the period [from, to] (both dates inclusive, YYYY-MM-DD). ' +
        'With group_by="day" it also breaks the period down by day; otherwise it returns only the overall total.',
      inputSchema: {
        from: dateSchema.describe('Start of the period, YYYY-MM-DD'),
        to: dateSchema.describe('End of the period, YYYY-MM-DD, inclusive'),
        group_by: z.enum(['day', 'total']).optional().describe('Defaults to total'),
      },
    },
    async ({ from, to, group_by }): Promise<CallToolResult> => {
      const profile = await fetchProfile(ctx);
      const timezone = profile?.timezone ?? 'Europe/Belgrade';
      const { start, end } = zonedPeriodRangeUtc(timezone, from, to);

      const { data, error } = await ctx.db
        .from('meals')
        .select('eaten_at, kcal, protein, fat, carbs')
        .eq('user_id', ctx.userId)
        .gte('eaten_at', start.toISOString())
        .lt('eaten_at', end.toISOString())
        .order('eaten_at', { ascending: true });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const total = rows.reduce(
        (acc, row) => ({
          kcal: acc.kcal + Number(row.kcal),
          protein: acc.protein + Number(row.protein),
          fat: acc.fat + Number(row.fat),
          carbs: acc.carbs + Number(row.carbs),
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      );

      const lines = [
        `Period ${from} — ${to} (${rows.length} ${rows.length === 1 ? 'meal' : 'meals'})`,
        `Total: ${macroLine(total.kcal, total.protein, total.fat, total.carbs)}`,
      ];

      if (group_by === 'day') {
        const byDay = new Map<string, { kcal: number; protein: number; fat: number; carbs: number }>();
        for (const row of rows) {
          const key = zonedDateKey(timezone, new Date(row.eaten_at));
          const acc = byDay.get(key) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 };
          acc.kcal += Number(row.kcal);
          acc.protein += Number(row.protein);
          acc.fat += Number(row.fat);
          acc.carbs += Number(row.carbs);
          byDay.set(key, acc);
        }
        lines.push('By day:');
        for (const [day, sums] of [...byDay.entries()].sort()) {
          lines.push(`  ${day}: ${macroLine(sums.kcal, sums.protein, sums.fat, sums.carbs)}`);
        }
        if (rows.length > 0) {
          const days = byDay.size || 1;
          lines.push(`Daily average: ${macroLine(total.kcal / days, total.protein / days, total.fat / days, total.carbs / days)}`);
        }
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );
}
