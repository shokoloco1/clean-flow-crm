import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStaffAvailability, useAvailableStaff } from './useStaffAvailability';
import { toast } from 'sonner';
import React from 'react';

// Mock useAuth
vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}));

// Mock supabase
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  },
}));

describe('useStaffAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  describe('initial state', () => {
    it('should have loading true initially', () => {
      const { result } = renderHook(() => useStaffAvailability());
      expect(result.current.loading).toBe(true);
    });

    it('should have empty availability initially', () => {
      const { result } = renderHook(() => useStaffAvailability());
      expect(result.current.availability).toEqual([]);
    });

    it('should have saving false initially', () => {
      const { result } = renderHook(() => useStaffAvailability());
      expect(result.current.saving).toBe(false);
    });
  });

  describe('fetchAvailability', () => {
    it('should fetch availability for target user', async () => {
      const mockAvailability = [
        { id: '1', user_id: 'user-123', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      mockOrder.mockResolvedValue({ data: mockAvailability, error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability).toEqual(mockAvailability);
    });

    it('should use default availability when none exists', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have 7 days (Sunday-Saturday)
      expect(result.current.availability).toHaveLength(7);
      // Monday should be available by default
      expect(result.current.availability.find(a => a.day_of_week === 1)?.is_available).toBe(true);
      // Sunday should not be available by default
      expect(result.current.availability.find(a => a.day_of_week === 0)?.is_available).toBe(false);
    });

    it('should set loading false after fetch', async () => {
      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should use staffId parameter when provided', async () => {
      const { result } = renderHook(() => useStaffAvailability('staff-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockEq).toHaveBeenCalledWith('user_id', 'staff-456');
    });
  });

  describe('toggleDay', () => {
    it('should toggle is_available for specified day', async () => {
      const mockAvailability = [
        { id: '1', user_id: 'user-123', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
        { id: '2', user_id: 'user-123', day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      mockOrder.mockResolvedValue({ data: mockAvailability, error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleDay(1);
      });

      expect(result.current.availability.find(a => a.day_of_week === 1)?.is_available).toBe(false);
    });

    it('should not affect other days', async () => {
      const mockAvailability = [
        { id: '1', user_id: 'user-123', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
        { id: '2', user_id: 'user-123', day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      mockOrder.mockResolvedValue({ data: mockAvailability, error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleDay(1);
      });

      // Day 2 should remain unchanged
      expect(result.current.availability.find(a => a.day_of_week === 2)?.is_available).toBe(true);
    });
  });

  describe('updateHours', () => {
    it('should update start_time and end_time for day', async () => {
      const mockAvailability = [
        { id: '1', user_id: 'user-123', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      mockOrder.mockResolvedValue({ data: mockAvailability, error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateHours(1, '08:00', '18:00');
      });

      const day1 = result.current.availability.find(a => a.day_of_week === 1);
      expect(day1?.start_time).toBe('08:00');
      expect(day1?.end_time).toBe('18:00');
    });

    it('should not affect other days', async () => {
      const mockAvailability = [
        { id: '1', user_id: 'user-123', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
        { id: '2', user_id: 'user-123', day_of_week: 2, start_time: '10:00', end_time: '16:00', is_available: true },
      ];
      mockOrder.mockResolvedValue({ data: mockAvailability, error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateHours(1, '08:00', '18:00');
      });

      // Day 2 should remain unchanged
      const day2 = result.current.availability.find(a => a.day_of_week === 2);
      expect(day2?.start_time).toBe('10:00');
      expect(day2?.end_time).toBe('16:00');
    });
  });

  describe('saveAvailability', () => {
    it('should upsert availability records', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveAvailability();
      });

      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should show success toast on save', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveAvailability();
      });

      expect(toast.success).toHaveBeenCalledWith('Availability saved');
    });

    it('should show error toast on failure', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockUpsert.mockResolvedValue({ error: new Error('Save failed') });

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveAvailability();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to save availability');
    });

    it('should set saving state during save', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockUpsert.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );

      const { result } = renderHook(() => useStaffAvailability());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveAvailability();
      });

      expect(result.current.saving).toBe(true);

      await act(async () => {
        await savePromise;
      });

      expect(result.current.saving).toBe(false);
    });
  });
});

describe('useAvailableStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no date/time', () => {
    const { result } = renderHook(() => useAvailableStaff('', ''));

    expect(result.current.availableStaff).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should return empty array when date is empty', () => {
    const { result } = renderHook(() => useAvailableStaff('', '09:00'));

    expect(result.current.availableStaff).toEqual([]);
  });

  it('should return empty array when time is empty', () => {
    const { result } = renderHook(() => useAvailableStaff('2024-01-15', ''));

    expect(result.current.availableStaff).toEqual([]);
  });

  it('should have loading state', () => {
    const { result } = renderHook(() => useAvailableStaff('2024-01-15', '09:00'));

    // Initially loading
    expect(result.current.loading).toBe(true);
  });
});
