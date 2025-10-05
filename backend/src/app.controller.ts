import { Public } from '@/common/decorators';
import { Controller, Get, Redirect } from '@nestjs/common';

@Controller('/')
export class AppController {
  @Public()
  @Get()
  @Redirect('/api/docs')
  rootToApiDocs() {}

  @Public()
  @Get('api')
  @Redirect('/api/docs')
  apiToApiDocs() {}
}
