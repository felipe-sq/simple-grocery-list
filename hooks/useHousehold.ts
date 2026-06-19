import { useHouseholdContext } from '@/lib/HouseholdProvider';

export function useHousehold(): { householdId: string | null; loading: boolean } {
  return useHouseholdContext();
}
