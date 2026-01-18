import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { DRIZZLE } from '../../db/drizzle.module';
import { NotFoundException } from '@nestjs/common';

describe('FinanceService', () => {
  let service: FinanceService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(() => {
        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          then: jest.fn((resolve) => resolve([])),
        };
        return chain;
      }),
      insert: jest.fn(() => ({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      })),
      update: jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      })),
      delete: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyExpensesSummary', () => {
    it('should calculate summary correctly', async () => {
      const expenses = [
        {
          amount: 100,
          status: 'PENDING',
          category: 'Travel',
          expense_date: '2024-01-05',
        },
        {
          amount: 200,
          status: 'APPROVED',
          category: 'Food',
          expense_date: '2024-01-10',
        },
        {
          amount: 300,
          status: 'PAID',
          category: 'Travel',
          expense_date: '2024-01-15',
        },
      ];

      // Setup mock to return expenses
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(expenses)),
      }));

      const result = await service.getMonthlyExpensesSummary('2024-01');

      expect(result.total_expenses).toBe(600);
      expect(result.pending_expenses).toBe(100);
      expect(result.approved_expenses).toBe(200);
      expect(result.paid_expenses).toBe(300);
      expect(result.categories['Travel']).toBe(400);
      expect(result.categories['Food']).toBe(200);
    });

    it('should handle empty results', async () => {
      // Default mock returns []
      const result = await service.getMonthlyExpensesSummary('2024-01');

      expect(result.total_expenses).toBe(0);
      expect(result.expense_count).toBe(0);
    });
  });

  describe('createExpense', () => {
    it('should create an expense', async () => {
      const dto = {
        expense_date: '2024-01-20',
        category: 'Office',
        description: 'Supplies',
        amount: 500,
      };

      const createdExpense = {
        id: 1,
        ...dto,
        expense_id: 'EXP-123',
        status: 'PENDING',
      };

      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([createdExpense]),
      }));

      const result = await service.createExpense(dto);

      expect(result).toEqual(createdExpense);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateExpense', () => {
    it('should update and return expense', async () => {
      const id = 1;
      const dto = { amount: 600 };
      const existingExpense = { id, amount: 500 };
      const updatedExpense = { id, amount: 600 };

      // First call: getExpense (check existence)
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([existingExpense])),
      }));

      // Update call
      mockDb.update.mockImplementationOnce(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      }));

      // Second call: getExpense (return updated)
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([updatedExpense])),
      }));

      const result = await service.updateExpense(id, dto);

      expect(result).toEqual(updatedExpense);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if expense does not exist', async () => {
      const id = 999;

      // Return empty array
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([])),
      }));

      await expect(service.updateExpense(id, { amount: 100 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteExpense', () => {
    it('should delete an expense', async () => {
      const id = 1;
      const existingExpense = { id, amount: 500 };

      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([existingExpense])),
      }));

      const result = await service.deleteExpense(id);

      expect(result).toEqual({ message: 'Deleted' });
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
