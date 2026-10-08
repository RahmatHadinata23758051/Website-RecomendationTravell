import { Test, TestingModule } from '@nestjs/testing';
import { AdminSubmissionsController } from './admin-submissions.controller';
import { PlacesSubmissionService } from './places-submission.service';
import { ModerationAction } from './dto/moderate-submission.dto';

describe('AdminSubmissionsController', () => {
  let controller: AdminSubmissionsController;
  let service: PlacesSubmissionService;

  const mockService = {
    getModerationQueue: jest.fn(),
    getSubmissionDetailForAdmin: jest.fn(),
    moderateSubmission: jest.fn(),
    retryPromotion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSubmissionsController],
      providers: [
        {
          provide: PlacesSubmissionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminSubmissionsController>(AdminSubmissionsController);
    service = module.get<PlacesSubmissionService>(PlacesSubmissionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get moderation queue', async () => {
    const expected = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    mockService.getModerationQueue.mockResolvedValue(expected);

    const result = await controller.getModerationQueue({});
    expect(result).toEqual(expected);
    expect(mockService.getModerationQueue).toHaveBeenCalledWith({});
  });

  it('should get submission detail', async () => {
    const expected = { id: 'sub-1', name: 'Detail' };
    mockService.getSubmissionDetailForAdmin.mockResolvedValue(expected);

    const result = await controller.getSubmissionDetail('sub-1');
    expect(result).toEqual(expected);
    expect(mockService.getSubmissionDetailForAdmin).toHaveBeenCalledWith('sub-1');
  });

  it('should moderate submission', async () => {
    const expected = { id: 'sub-1', status: 'APPROVED' };
    mockService.moderateSubmission.mockResolvedValue(expected);

    const result = await controller.reviewSubmission(
      'sub-1',
      { user: { id: 'admin-1', role: 'ADMIN' } },
      { action: ModerationAction.APPROVE, moderationNotes: 'Looks good' },
    );

    expect(result).toEqual(expected);
    expect(mockService.moderateSubmission).toHaveBeenCalledWith(
      'sub-1',
      'admin-1',
      ModerationAction.APPROVE,
      'Looks good',
      undefined,
      undefined,
    );
  });

  it('should retry promotion for approved submission', async () => {
    const expected = { id: 'sub-1', status: 'APPROVED', promotedAt: new Date() };
    mockService.retryPromotion.mockResolvedValue(expected);

    const result = await controller.retryPromotion('sub-1', { user: { id: 'admin-1', role: 'ADMIN' } });

    expect(result).toEqual(expected);
    expect(mockService.retryPromotion).toHaveBeenCalledWith('sub-1', 'admin-1');
  });
});
