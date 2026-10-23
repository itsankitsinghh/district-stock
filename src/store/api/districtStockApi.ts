import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  MasterDataState,
  InboundRecord,
  MovementsState,
  User,
} from '../../types';

const API_BASE_URL = 'https://district-stock-api.onrender.com/api';

export const districtStockApi = createApi({
  reducerPath: 'districtStockApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Master', 'Inbounds', 'Movements', 'Users'],
  endpoints: (builder) => ({
    // 1. Master Data (Warehouses, Products, Events, Requisitions)
    getMaster: builder.query<{ success: boolean; data: MasterDataState }, void>({
      query: () => '/data/master',
      providesTags: ['Master'],
    }),
    saveMaster: builder.mutation<{ success: boolean; message?: string }, Partial<MasterDataState>>({
      query: (body) => ({
        url: '/data/master',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Master'],
    }),

    // 2. Inbound Consignments
    getInbounds: builder.query<{ success: boolean; data: InboundRecord[] }, void>({
      query: () => '/data/inbound',
      providesTags: ['Inbounds'],
    }),
    saveInbounds: builder.mutation<{ success: boolean; message?: string }, InboundRecord[]>({
      query: (body) => ({
        url: '/data/inbound',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inbounds'],
    }),

    // 3. Movements (Outbounds, Transfers, Returns)
    getMovements: builder.query<{ success: boolean; data: MovementsState }, void>({
      query: () => '/data/movements',
      providesTags: ['Movements'],
    }),
    saveMovements: builder.mutation<{ success: boolean; message?: string }, Partial<MovementsState>>({
      query: (body) => ({
        url: '/data/movements',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Movements'],
    }),

    // 4. Users Setup
    getUsers: builder.query<{ success: boolean; data: User[] }, void>({
      query: () => '/data/users',
      providesTags: ['Users'],
    }),
    saveUsers: builder.mutation<{ success: boolean; message?: string }, User[]>({
      query: (body) => ({
        url: '/data/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    // 5. Full Cloud Sync Trigger
    triggerCloudSync: builder.mutation<{ success: boolean; data?: any }, { direction: 'push' | 'pull' | 'both' }>({
      query: (body) => ({
        url: '/sync',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Master', 'Inbounds', 'Movements', 'Users'],
    }),
  }),
});

export const {
  useGetMasterQuery,
  useSaveMasterMutation,
  useGetInboundsQuery,
  useSaveInboundsMutation,
  useGetMovementsQuery,
  useSaveMovementsMutation,
  useGetUsersQuery,
  useSaveUsersMutation,
  useTriggerCloudSyncMutation,
} = districtStockApi;
