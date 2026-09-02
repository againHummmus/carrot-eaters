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
        'Возвращает список приёмов пищи за период (по умолчанию — сегодня) вместе с их meal_id. ' +
        'Вызывай этот инструмент перед update_meal или delete_meal — они принимают meal_id, а не название, ' +
        'и без list_meals у тебя нет способа его узнать.',
      inputSchema: {
        from: dateSchema.optional().describe('Начало периода, YYYY-MM-DD. По умолчанию — сегодня'),
        to: dateSchema.optional().describe('Конец периода, YYYY-MM-DD, включительно. По умолчанию — совпадает с from'),
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
          content: [{ type: 'text', text: `Приёмов пищи за ${fromDate}${toDate !== fromDate ? ` — ${toDate}` : ''} не найдено.` }],
        };
      }

      const lines = rows.map((row) => {
        const time = new Date(row.eaten_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone,
        });
        return `${row.id} · ${time} · ${row.title} — ${macroLine(row.kcal, row.protein, row.fat, row.carbs)}`;
      });

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );
}
