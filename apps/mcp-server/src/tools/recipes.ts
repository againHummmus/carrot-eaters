import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  formatAmount,
  scaleAmount,
  scaleNutrients,
  type Recipe,
  type RecipeWithIngredients,
} from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { round, macroLine } from '../format.js';

const ingredientSchema = z.object({
  name: z.string().describe('Название продукта'),
  amount: z
    .number()
    .nullable()
    .optional()
    .describe('Количество НА ОДНУ ПОРЦИЮ. null или пропуск — «по вкусу» (соль, специи), такое не масштабируется'),
  unit: z.string().nullable().optional().describe('Единица: г, мл, шт, ст. л., ч. л. …'),
});

const PER_SERVING = 'НА ОДНУ ПОРЦИЮ';

/** Loads one recipe of the current user by id or by (case-insensitive, partial) title. */
export async function findRecipe(
  ctx: ToolContext,
  by: { recipe_id?: string; title?: string }
): Promise<RecipeWithIngredients | null> {
  let query = ctx.db
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*)')
    .eq('user_id', ctx.userId)
    .limit(1);
  query = by.recipe_id ? query.eq('id', by.recipe_id) : query.ilike('title', `%${by.title}%`);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const recipe = data as RecipeWithIngredients;
  recipe.ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return recipe;
}

function renderRecipe(recipe: RecipeWithIngredients, servings: number): string {
  const n = scaleNutrients(recipe, servings);
  const portionWord = servings === 1 ? '1 порцию' : `${servings} порц.`;

  const lines: string[] = [`«${recipe.title}» — на ${portionWord}`];
  if (recipe.description) lines.push(recipe.description);

  lines.push('', 'Ингредиенты:');
  for (const ingredient of recipe.ingredients) {
    lines.push(`— ${ingredient.name}: ${formatAmount(scaleAmount(ingredient.amount, servings), ingredient.unit)}`);
  }

  if (recipe.steps.length > 0) {
    lines.push('', 'Приготовление:', ...recipe.steps.map((step, i) => `${i + 1}. ${step}`));
  }

  lines.push(
    '',
    `КБЖУ: ${macroLine(n.kcal, n.protein, n.fat, n.carbs)}`,
    `Клетчатка ${round(n.fiber ?? 0)} г · сахар ${round(n.sugar ?? 0)} г · нас. жиры ${round(n.saturated_fat ?? 0)} г · ` +
      `холестерин ${round(n.cholesterol ?? 0)} мг · натрий ${round(n.sodium ?? 0)} мг`,
    `(id: ${recipe.id})`
  );

  return lines.join('\n');
}

export function registerRecipeTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'save_recipe',
    {
      description:
        'Сохраняет рецепт в личную книгу рецептов пользователя. Вызывай, когда пользователь просит записать/сохранить рецепт. ' +
        `ВСЁ — и количество ингредиентов, и КБЖУ — указывай ${PER_SERVING}: в вебе пользователь сам выставит нужное число порций, ` +
        'и количества пересчитаются. fiber/sugar/saturated_fat/cholesterol/sodium обязательны — оцени их наравне с КБЖУ, ' +
        'даже приблизительно. Если рецепт с таким же названием уже есть у пользователя — он будет перезаписан.',
      inputSchema: {
        title: z.string().min(1).describe('Название рецепта'),
        description: z.string().optional().describe('Короткое описание, 1–2 предложения'),
        ingredients: z.array(ingredientSchema).min(1).describe(`Продукты в расчёте ${PER_SERVING}`),
        steps: z.array(z.string()).min(1).describe('Шаги приготовления по порядку, без нумерации в самом тексте'),
        kcal: z.number().describe(`Калории ${PER_SERVING}`),
        protein: z.number().describe(`Белки, г, ${PER_SERVING}`),
        fat: z.number().describe(`Жиры, г, ${PER_SERVING}`),
        carbs: z.number().describe(`Углеводы, г, ${PER_SERVING}`),
        fiber: z.number().describe(`Клетчатка, г, ${PER_SERVING} — обязательно, оцени хотя бы приблизительно`),
        sugar: z.number().describe(`Сахар, г, ${PER_SERVING} — обязательно, оцени хотя бы приблизительно`),
        saturated_fat: z.number().describe(`Насыщенные жиры, г, ${PER_SERVING} — обязательно`),
        cholesterol: z.number().describe(`Холестерин, мг, ${PER_SERVING} — обязательно`),
        sodium: z.number().describe(`Натрий, мг, ${PER_SERVING} — обязательно`),
      },
    },
    async ({ title, description, ingredients, steps, ...nutrients }): Promise<CallToolResult> => {
      const existing = await findRecipe(ctx, { title });
      // findRecipe matches partially, so only an exact (case-insensitive) title is "the same recipe".
      const sameTitle = existing && existing.title.toLowerCase() === title.toLowerCase() ? existing : null;

      const row = { title, description: description ?? null, steps, ...nutrients };

      let recipeId: string;
      if (sameTitle) {
        const { error } = await ctx.db
          .from('recipes')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', sameTitle.id);
        if (error) throw new Error(error.message);

        const { error: clearError } = await ctx.db.from('recipe_ingredients').delete().eq('recipe_id', sameTitle.id);
        if (clearError) throw new Error(clearError.message);
        recipeId = sameTitle.id;
      } else {
        const { data, error } = await ctx.db
          .from('recipes')
          .insert({ user_id: ctx.userId, ...row })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        recipeId = (data as { id: string }).id;
      }

      const { error: ingredientsError } = await ctx.db.from('recipe_ingredients').insert(
        ingredients.map((ingredient, index) => ({
          recipe_id: recipeId,
          sort_order: index,
          name: ingredient.name,
          amount: ingredient.amount ?? null,
          unit: ingredient.unit ?? null,
        }))
      );
      if (ingredientsError) throw new Error(ingredientsError.message);

      const verb = sameTitle ? 'Рецепт обновлён' : 'Рецепт сохранён';
      return {
        content: [
          {
            type: 'text',
            text:
              `${verb}: «${title}» — ${ingredients.length} ингр., шагов: ${steps.length}, ` +
              `${macroLine(nutrients.kcal, nutrients.protein, nutrients.fat, nutrients.carbs)} на порцию.\n` +
              `В вебе на странице «Рецепты» можно выставить число порций и пересчитать ингредиенты. (id: ${recipeId})`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'list_recipes',
    {
      description:
        'Показывает сохранённые рецепты пользователя (название, КБЖУ на порцию, id). ' +
        'Вызывай перед get_recipe, log_recipe_portion или delete_recipe, если id рецепта неизвестен.',
      inputSchema: {
        query: z.string().optional().describe('Фильтр по части названия'),
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      let request = ctx.db
        .from('recipes')
        .select('id, title, kcal, protein, fat, carbs')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (query) request = request.ilike('title', `%${query}%`);

      const { data, error } = await request;
      if (error) throw new Error(error.message);

      const recipes = (data ?? []) as Recipe[];
      if (recipes.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: query
                ? `Рецептов по запросу «${query}» нет.`
                : 'Книга рецептов пока пуста. Сохрани первый рецепт через save_recipe.',
            },
          ],
        };
      }

      const lines = recipes.map(
        (recipe) => `— «${recipe.title}» — ${macroLine(recipe.kcal, recipe.protein, recipe.fat, recipe.carbs)} на порцию (id: ${recipe.id})`
      );
      return { content: [{ type: 'text', text: `Рецептов: ${recipes.length}\n${lines.join('\n')}` }] };
    }
  );

  server.registerTool(
    'get_recipe',
    {
      description:
        'Возвращает полный рецепт: ингредиенты, шаги приготовления и КБЖУ. ' +
        'servings пересчитывает и ингредиенты, и нутриенты на нужное число порций.',
      inputSchema: {
        recipe_id: z.string().uuid().optional().describe('ID рецепта, если известен'),
        title: z.string().optional().describe('Название рецепта для поиска, если id неизвестен'),
        servings: z.number().positive().optional().describe('На сколько порций пересчитать, по умолчанию 1'),
      },
    },
    async ({ recipe_id, title, servings }): Promise<CallToolResult> => {
      if (!recipe_id && !title) {
        return { content: [{ type: 'text', text: 'Укажи recipe_id или title.' }], isError: true };
      }
      const recipe = await findRecipe(ctx, { recipe_id, title });
      if (!recipe) {
        return { content: [{ type: 'text', text: `Рецепт не найден по запросу «${recipe_id ?? title}».` }] };
      }
      return { content: [{ type: 'text', text: renderRecipe(recipe, servings ?? 1) }] };
    }
  );

  server.registerTool(
    'delete_recipe',
    {
      description:
        'Удаляет рецепт из книги рецептов вместе с ингредиентами. Принимает recipe_id, а не название — сначала найди его через list_recipes.',
      inputSchema: {
        recipe_id: z.string().uuid().describe('ID рецепта из list_recipes'),
      },
    },
    async ({ recipe_id }): Promise<CallToolResult> => {
      const { data, error } = await ctx.db
        .from('recipes')
        .delete()
        .eq('id', recipe_id)
        .eq('user_id', ctx.userId)
        .select('title')
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return { content: [{ type: 'text', text: `Рецепт ${recipe_id} не найден.` }] };
      }
      return { content: [{ type: 'text', text: `Рецепт «${(data as { title: string }).title}» удалён.` }] };
    }
  );
}
