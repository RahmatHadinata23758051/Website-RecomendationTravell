import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PerformanceInterceptor } from './performance.interceptor';

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new PerformanceInterceptor();

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/v1/destinations',
      url: '/api/v1/destinations',
    };

    mockResponse = {
      statusCode: 200,
      headersSent: false,
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should add X-Response-Time header to response', (done) => {
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-Response-Time',
          expect.stringMatching(/^\d+\.\d{2}ms$/),
        );
        done();
      },
    });
  });

  it('should not set header if headersSent is true', (done) => {
    mockResponse.headersSent = true;
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: () => {
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should set header even on error response', (done) => {
    mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Boom')));
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      error: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-Response-Time',
          expect.stringMatching(/^\d+\.\d{2}ms$/),
        );
        done();
      },
    });
  });

  it('should log structured warning when request exceeds 500ms', (done) => {
    // Mock process.hrtime.bigint to simulate >500ms duration
    const realBigInt = process.hrtime.bigint;
    let callCount = 0;
    jest.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 1_000_000_000n; // start
      return 1_600_000_000n; // +600ms
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: () => {
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/api/v1/destinations',
            status: 200,
            durationMs: expect.any(Number),
          }),
        );
        expect(loggerWarnSpy.mock.calls[0][0].durationMs).toBeGreaterThan(500);
        process.hrtime.bigint = realBigInt;
        done();
      },
    });
  });

  it('should not log warning when request duration is <= 500ms', (done) => {
    const realBigInt = process.hrtime.bigint;
    let callCount = 0;
    jest.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 1_000_000_000n;
      return 1_050_000_000n; // +50ms
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: () => {
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        process.hrtime.bigint = realBigInt;
        done();
      },
    });
  });

  it('should fallback to request.url when originalUrl is absent', (done) => {
    delete mockRequest.originalUrl;
    const realBigInt = process.hrtime.bigint;
    let callCount = 0;
    jest.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 1_000_000_000n;
      return 1_600_000_000n;
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    result$.subscribe({
      next: () => {
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/v1/destinations',
          }),
        );
        process.hrtime.bigint = realBigInt;
        done();
      },
    });
  });
});
