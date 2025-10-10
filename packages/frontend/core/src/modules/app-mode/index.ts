import type { Framework } from '@toeverything/infra';

import { AppModeService } from './service';

export function configureAppModeModule(framework: Framework) {
  framework.service(AppModeService);
}
