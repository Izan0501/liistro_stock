import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const getAuthToken = () => localStorage.getItem('auth:v1');

export const useDashboardMetrics = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['dashboardMetrics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.start && dateRange.start.trim() !== '') params.append('start_date', dateRange.start);
      if (dateRange?.end && dateRange.end.trim() !== '') params.append('end_date', dateRange.end);
      
      const queryString = params.toString();
      const url = queryString ? `/dashboard/metrics?${queryString}` : '/dashboard/metrics';
      try {
        const { data } = await api.get(url);
        return data;
      } catch (error) {
        console.warn('Dashboard metrics API error (fallback applied):', error);
        return {
          total_sales_revenue: 0,
          total_clients_count: 0,
          total_products_count: 0,
          total_sales_count: 0,
          monthly_revenue: [],
          top_products: []
        };
      }
    },
    enabled: !!getAuthToken(),
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

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers');
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

export const useSales = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['sales', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.start && dateRange.start.trim() !== '') params.append('start_date', dateRange.start);
      if (dateRange?.end && dateRange.end.trim() !== '') params.append('end_date', dateRange.end);
      
      const queryString = params.toString();
      const url = queryString ? `/sales?${queryString}` : '/sales';
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!getAuthToken(),
  });
};

export const usePurchases = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['purchases', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.start && dateRange.start.trim() !== '') params.append('start_date', dateRange.start);
      if (dateRange?.end && dateRange.end.trim() !== '') params.append('end_date', dateRange.end);
      
      const queryString = params.toString();
      const url = queryString ? `/purchases?${queryString}` : '/purchases';
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!getAuthToken(),
  });
};


export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/dashboard/recent-activity');
        return data;
      } catch (error) {
        console.warn('Recent activity API error (fallback applied):', error);
        return [];
      }
    },
    enabled: !!getAuthToken(),
  });
};
