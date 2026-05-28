#!/bin/bash
set -e

echo "🔧 Fixing TypeScript errors..."

# 1. Fix Prisma import and type usage in http-exception.filter.ts
cat > apps/api/src/common/filters/http-exception.filter.ts << 'INNER'
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Unique constraint violation';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else {
        message = `Database error: ${exception.code}`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
    } else if (exception instanceof Error) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
INNER

# 2. Fix transaction callback types (add Prisma.TransactionClient)
for file in apps/api/src/employers/employers.service.ts apps/api/src/payroll/payroll.service.ts; do
  sed -i 's/async (tx) =>/async (tx: Prisma.TransactionClient) =>/g' "$file"
  if ! grep -q "import { Prisma } from '@prisma/client'" "$file"; then
    sed -i "1i import { Prisma } from '@prisma/client';" "$file"
  fi
done

# 3. Fix implicit any in .map() callbacks
sed -i 's/.map((s) => s.skill.name)/.map((s: any) => s.skill.name)/g' apps/api/src/jobs/jobs.service.ts
sed -i 's/.map((c) => c.id)/.map((c: any) => c.id)/g' apps/api/src/payroll/payroll.service.ts
sed -i 's/.map((r) => r.type)/.map((r: any) => r.type)/g' apps/api/src/verification/verification.service.ts
sed -i 's/.find((b) => b.type === type)/.find((b: any) => b.type === type)/g' apps/api/src/hrms/hrms.service.ts
sed -i 's/.map((c) => {/.map((c: any) => {/g' apps/api/src/payroll/payroll.service.ts
sed -i 's/(acc, p) =>/(acc: any, p: any) =>/g' apps/api/src/payroll/payroll.service.ts

# 4. Fix Health check - make PrismaService extend PrismaClient
cat > apps/api/src/prisma/prisma.service.ts << 'INNER'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
INNER

# 5. Rebuild and restart
echo "✅ Fixes applied. Rebuilding..."
npm run clean 2>/dev/null || rm -rf apps/api/dist
npm run dev
