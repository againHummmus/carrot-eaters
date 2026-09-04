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

const INSTRUCTIONS = `Check the profile with get_profile before logging any food for the first time in a conversation.
If there is no profile, ask the user for their name and daily calorie goal (calories only — protein/fat/carbs are
derived automatically) and call setup_profile. After every log_meal or log_recipe_portion, tell the user the running
day total and what is left against the goal — those tools already return that summary, so just relay it.
update_meal and delete_meal take a meal_id, not a title, and you have no way to know it up front: always call
list_meals first to find the right id before editing or deleting.
When the user asks to save a recipe, call save_recipe. Always give its ingredients and nutrients per SINGLE serving:
the user picks the number of servings in the web app and the amounts are rescaled from there. delete_recipe takes a
recipe_id — look it up with list_recipes first.

Tool output is written in English. Reply to the user in whatever language they are speaking.`;

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
