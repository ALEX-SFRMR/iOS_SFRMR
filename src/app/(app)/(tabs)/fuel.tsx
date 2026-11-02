import { View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Empty, FadeIn, Glass, Inset, Meter, Screen, Section, Text } from '@/ui';
import { AccountButton, Loading, pullToRefresh, Stat } from '@/features/common';
import { useFuelToday } from '@/data/queries';
import { useAuth } from '@/lib/auth';
import { toDisplayWeight, unitLabel } from '@/core/progress/units';
import { space } from '@/theme/tokens';

export default function Fuel() {
  const { user } = useAuth();
  const unit = user?.weight_unit ?? 'lbs';
  const { data, isLoading, isRefetching, refetch } = useFuelToday();

  return (
    <Screen eyebrow={format(new Date(), 'EEEE')} title="Fuel" accessory={<AccountButton />} refreshControl={pullToRefresh(isRefetching, refetch)}>
      {isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <FadeIn delay={40}>
            {data.target ? (
              <Glass strong>
                <View style={{ gap: space.lg }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Stat value={Math.max(0, data.target.calories - Math.round(data.eaten.calories)).toLocaleString()} label="Calories left" />
                    <Stat value={Math.max(0, data.target.protein - Math.round(data.eaten.protein))} unit="g" label="Protein left" />
                  </View>
                  <Meter value={data.eaten.calories} max={data.target.calories} />
                  <Text variant="caption" tone="dim">
                    Target {data.target.calories.toLocaleString()} cal · {data.target.protein}g protein
                  </Text>
                </View>
              </Glass>
            ) : (
              <Empty title="No targets yet" body="Your coach sets calories and protein from your goal weight or body-fat and a target date." />
            )}
          </FadeIn>

          <FadeIn delay={100}>
            <Section label="Logged today">
              {data.meals.length ? (
                <Glass padded={false}>
                  {data.meals.map((m: any) => (
                    <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: space.lg }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="headline" numberOfLines={1}>{m.name || m.meal_type}</Text>
                        <Text variant="caption" tone="dim">{m.meal_type}{m.time ? ` · ${m.time}` : ''}</Text>
                      </View>
                      <Text tone="dim">{Math.round(m.total_calories || 0)} cal · {Math.round(m.total_protein_g || 0)}g</Text>
                    </View>
                  ))}
                </Glass>
              ) : (
                <Inset><Text tone="dim">Nothing logged yet today.</Text></Inset>
              )}
            </Section>
          </FadeIn>

          <FadeIn delay={160}>
            <Section label="Body weight">
              {data.weights.length ? (
                <Glass>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Stat value={toDisplayWeight(data.weights[0].weight_kg, unit)} unit={unitLabel(unit)} label={format(parseISO(data.weights[0].date), 'MMM d')} />
                  </View>
                </Glass>
              ) : (
                <Inset><Text tone="dim">No weigh-ins yet.</Text></Inset>
              )}
            </Section>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}
