import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { macroTargets } from '@carrot-eaters/shared';
import type { Profile } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';

export const NO_PROFILE_HINT =
  'Профиль не настроен. Спроси у пользователя имя и дневную цель по калориям (только калории — Б/Ж/У считаются автоматически), затем вызови setup_profile.';

export async function fetchProfile(ctx: ToolContext): Promise<Profile | null> {
  const { data, error } = await ctx.db.from('profiles').select('*').eq('user_id', ctx.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

function profileSummary(profile: Profile): string {
  const targets = macroTargets(profile.kcal_target);
  return [
    `Имя: ${profile.name}`,
    `Таймзона: ${profile.timezone}`,
    `Цель: ${profile.kcal_target} ккал (Б${targets.protein}/Ж${targets.fat}/У${targets.carbs})`,
  ].join('\n');
}

export function registerProfileTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'get_profile',
    {
      description:
        'Возвращает профиль текущего пользователя (имя, таймзона, цель по калориям и вычисленные цели по БЖУ). ' +
        'Вызывай перед первым логированием еды в разговоре. Если профиля нет — вернёт явную подсказку, что делать дальше.',
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      const profile = await fetchProfile(ctx);
      if (!profile) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
      }
      return { content: [{ type: 'text', text: profileSummary(profile) }] };
    }
  );

  server.registerTool(
    'setup_profile',
    {
      description:
        'Создаёт профиль пользователя. Вызывай, когда get_profile вернул подсказку об отсутствии профиля. ' +
        'Целевые Б/Ж/У отдельно не запрашивай — считаются автоматически от kcal_target (30/30/40).',
      inputSchema: {
        name: z.string().min(1).describe('Имя пользователя'),
        kcal_target: z.number().positive().describe('Дневная цель по калориям'),
        timezone: z.string().optional().describe('IANA таймзона, по умолчанию Europe/Belgrade'),
      },
    },
    async ({ name, kcal_target, timezone }): Promise<CallToolResult> => {
      const { data, error } = await ctx.db
        .from('profiles')
        .upsert({ user_id: ctx.userId, name, kcal_target, timezone: timezone ?? 'Europe/Belgrade' })
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      const targets = macroTargets((data as Profile).kcal_target);
      return {
        content: [
          {
            type: 'text',
            text: `Профиль создан.\n${profileSummary(data as Profile)}\n(Б${targets.protein}/Ж${targets.fat}/У${targets.carbs} — расчёт от калорийности)`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'update_targets',
    {
      description: 'Обновляет дневную цель по калориям. Целевые Б/Ж/У пересчитываются автоматически.',
      inputSchema: {
        kcal_target: z.number().positive().describe('Новая дневная цель по калориям'),
      },
    },
    async ({ kcal_target }): Promise<CallToolResult> => {
      const existing = await fetchProfile(ctx);
      if (!existing) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
      }

      const { data, error } = await ctx.db
        .from('profiles')
        .update({ kcal_target })
        .eq('user_id', ctx.userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      const targets = macroTargets((data as Profile).kcal_target);
      return {
        content: [
          {
            type: 'text',
            text: `Цель обновлена: ${kcal_target} ккал (Б${targets.protein}/Ж${targets.fat}/У${targets.carbs})`,
          },
        ],
      };
    }
  );
}
