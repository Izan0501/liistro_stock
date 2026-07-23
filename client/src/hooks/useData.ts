import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const getAuthToken = () => localStorage.getItem('access_token');

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      // Trying the /dashboard/metrics endpoint first, assuming standard REST
      const { data } = await api.get('/dashboard/metrics');
      return data;
    },
    enabled: !!getAuthToken(),
    // We expect the backend to return starting capital ($5M), inventory valuation, supplier counts, etc.
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
    enabled: !!getAuthToken(),
  });
};

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data;
    },
    enabled: !!getAuthToken(),
  });
};
