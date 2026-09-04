import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { macroTargets } from '@carrot-eaters/shared';
import type { Profile } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';

export const NO_PROFILE_HINT =
  'No profile set up yet. Ask the user for their name and daily calorie goal (calories only — protein/fat/carbs are derived automatically), then call setup_profile.';

export async function fetchProfile(ctx: ToolContext): Promise<Profile | null> {
  const { data, error } = await ctx.db.from('profiles').select('*').eq('user_id', ctx.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

function profileSummary(profile: Profile): string {
  const targets = macroTargets(profile.kcal_target);
  return [
    `Name: ${profile.name}`,
    `Time zone: ${profile.timezone}`,
    `Goal: ${profile.kcal_target} kcal (P${targets.protein}/F${targets.fat}/C${targets.carbs})`,
  ].join('\n');
}

export function registerProfileTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'get_profile',
    {
      description:
        'Returns the current user profile (name, time zone, calorie goal and the derived macro targets). ' +
        'Call this before logging food for the first time in a conversation. If there is no profile, it returns an explicit hint on what to do next.',
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
        'Creates the user profile. Call this when get_profile reported that no profile exists. ' +
        'Do not ask for macro targets separately — they are derived from kcal_target (30/30/40).',
      inputSchema: {
        name: z.string().min(1).describe('User name'),
        kcal_target: z.number().positive().describe('Daily calorie goal'),
        timezone: z.string().optional().describe('IANA time zone, defaults to Europe/Belgrade'),
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
            text: `Profile created.\n${profileSummary(data as Profile)}\n(P${targets.protein}/F${targets.fat}/C${targets.carbs} — derived from the calorie goal)`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'update_targets',
    {
      description: 'Updates the daily calorie goal. Macro targets are recalculated automatically.',
      inputSchema: {
        kcal_target: z.number().positive().describe('New daily calorie goal'),
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
            text: `Goal updated: ${kcal_target} kcal (P${targets.protein}/F${targets.fat}/C${targets.carbs})`,
          },
        ],
      };
    }
  );
}
