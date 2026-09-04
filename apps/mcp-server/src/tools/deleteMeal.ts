import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './context.js';

export function registerDeleteMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'delete_meal',
    {
      description:
        'Deletes a meal by meal_id, along with its meal_items. ' +
        'You do not know the meal_id up front — call list_meals first to find it.',
      inputSchema: {
        meal_id: z.string().uuid(),
      },
    },
    async ({ meal_id }): Promise<CallToolResult> => {
      const { data, error } = await ctx.db.from('meals').delete().eq('id', meal_id).eq('user_id', ctx.userId).select('id, title').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return { content: [{ type: 'text', text: 'Meal not found.' }], isError: true };
      }
      return { content: [{ type: 'text', text: `Deleted: ${data.title}` }] };
    }
  );
}
