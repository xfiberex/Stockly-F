import { useQuery } from "@tanstack/react-query";
import { AuthAPI} from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: queryKeys.user,
    queryFn: ({ signal }) => AuthAPI.getMe(signal),
    retry: false,
    refetchOnMount: false,
  });

  return { user, isLoading, isError };
}