import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './context.js';

export function registerDeleteMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'delete_meal',
    {
      description: 'Удаляет приём пищи по meal_id (вместе со связанными meal_items).',
      inputSchema: {
        meal_id: z.string().uuid(),
      },
    },
    async ({ meal_id }): Promise<CallToolResult> => {
      const { data, error } = await ctx.db.from('meals').delete().eq('id', meal_id).eq('user_id', ctx.userId).select('id, title').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return { content: [{ type: 'text', text: 'Приём пищи не найден.' }], isError: true };
      }
      return { content: [{ type: 'text', text: `Удалено: ${data.title}` }] };
    }
  );
}
