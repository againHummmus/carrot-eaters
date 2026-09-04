import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { buildToolContext } from './tools/context.js';
import { registerProfileTools } from './tools/profile.js';
import { registerLogMealTool } from './tools/logMeal.js';
import { registerLogRecipePortionTool } from './tools/logRecipePortion.js';
import { registerGetStatsTool } from './tools/getStats.js';
import { registerListMealsTool } from './tools/listMeals.js';
import { registerUpdateMealTool } from './tools/updateMeal.js';
import { registerDeleteMealTool } from './tools/deleteMeal.js';
import { registerRecipeTools } from './tools/recipes.js';

const INSTRUCTIONS = `Перед первым логированием еды в разговоре проверяй профиль через get_profile.
Если профиля нет — спроси у пользователя имя и дневную цель по калориям (только калории — Б/Ж/У считаются
автоматически) и вызови setup_profile. После каждого log_meal или log_recipe_portion сообщай пользователю
итог за день и остаток до цели — эти инструменты уже возвращают готовую сводку, просто перескажи её.
update_meal и delete_meal принимают meal_id, а не название — у тебя нет его заранее, поэтому перед правкой
или удалением всегда сначала вызывай list_meals, чтобы найти нужный id.
Когда пользователь просит записать/сохранить рецепт — вызывай save_recipe. Ингредиенты и КБЖУ в нём всегда
указывай в расчёте на ОДНУ порцию: число порций пользователь выставляет сам в вебе, и количества
пересчитываются автоматически. delete_recipe принимает recipe_id — сначала найди его через list_recipes.`;

export function buildMcpServer(auth: AuthInfo): McpServer {
  const ctx = buildToolContext(auth);

  const server = new McpServer(
    { name: 'carrot-eaters-mcp', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS }
  );

  registerProfileTools(server, ctx);
  registerLogMealTool(server, ctx);
  registerLogRecipePortionTool(server, ctx);
  registerGetStatsTool(server, ctx);
  registerListMealsTool(server, ctx);
  registerUpdateMealTool(server, ctx);
  registerDeleteMealTool(server, ctx);
  registerRecipeTools(server, ctx);

  return server;
}
