import { View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Empty, FadeIn, Glass, Screen, Section, Text } from '@/ui';
import { AccountButton, Loading, pullToRefresh, Stat } from '@/features/common';
import { useConsistency, useRecentPRs } from '@/data/queries';
import { useAuth } from '@/lib/auth';
import { formatWeight } from '@/core/progress/units';
import { color, space } from '@/theme/tokens';

const WEEK_STATE: Record<string, string> = {
  full: 'Full week',
  standard_met: 'Standard held',
  below_standard: 'Below standard',
  paused: 'Paused',
  free_week: 'First week',
  in_progress: 'This week',
};

export default function Progress() {
  const { user } = useAuth();
  const unit = user?.weight_unit ?? 'lbs';
  const c = useConsistency();
  const prs = useRecentPRs(8);
  const refresh = () => { c.refetch(); prs.refetch(); };

  return (
    <Screen eyebrow="Identity" title="Progress" accessory={<AccountButton />} refreshControl={pullToRefresh(c.isRefetching || prs.isRefetching, refresh)}>
      {c.isLoading || !c.data ? (
        <Loading />
      ) : (
        <>
          <FadeIn delay={40}>
            <Glass strong>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Stat value={c.data.streak} label="Week streak" />
                <Stat value={c.data.lifetime.lifetime_workouts} label="Workouts" />
                <Stat value={c.data.lifetime.lifetime_weeks_trained} label="Weeks trained" />
              </View>
              <Text variant="caption" tone="dim" style={{ marginTop: space.md }}>Lifetime numbers never reset.</Text>
            </Glass>
          </FadeIn>

          <FadeIn delay={100}>
            <Section label="Recent weeks">
              {c.data.weeks.length ? (
                <Glass padded={false}>
                  {c.data.weeks.slice(0, 8).map((w: any, i: number) => (
                    <View key={w.id ?? w.week_start_date} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md, paddingHorizontal: space.lg, borderTopWidth: i ? 0.5 : 0, borderColor: color.hairline }}>
                      <Text>{format(parseISO(w.week_start_date), 'MMM d')}</Text>
                      <Text tone={w.status === 'full' || w.status === 'standard_met' ? 'default' : 'dim'}>
                        {w.counted_workouts}/{w.target} · {WEEK_STATE[w.status] ?? ''}
                      </Text>
                    </View>
                  ))}
                </Glass>
              ) : (
                <Empty title="Your first week is underway" body="Every week you hold your standard shows up here." />
              )}
            </Section>
          </FadeIn>

          <FadeIn delay={160}>
            <Section label="Personal records">
              {prs.data?.length ? (
                <Glass padded={false}>
                  {prs.data.map((r: any, i: number) => (
                    <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, borderTopWidth: i ? 0.5 : 0, borderColor: color.hairline }}>
                      {/* PRs are one of the few places red is allowed. */}
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.red }} />
                      <View style={{ flex: 1 }}>
                        <Text variant="headline" numberOfLines={1}>{r.exercise_name}</Text>
                        <Text variant="caption" tone="dim">{r.achieved_date ? format(parseISO(r.achieved_date), 'MMM d') : ''}</Text>
                      </View>
                      <Text variant="headline">{formatWeight(r.weight_kg, unit)} × {r.reps}</Text>
                    </View>
                  ))}
                </Glass>
              ) : (
                <Empty title="No PRs yet" body="PRs unlock after three sessions of a lift, so they’re real when they show up." />
              )}
            </Section>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}
