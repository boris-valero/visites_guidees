<?php

/**
 * @copyright Copyright (c) 2020 Morris Jobke <hey@morrisjobke.de>
 *
 * @author Morris Jobke <hey@morrisjobke.de>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\Intros\Listener;

use OCA\Intros\AppInfo\Application;
use OCP\App\IAppManager;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\AppFramework\Services\IInitialState;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IConfig;
use OCP\IRequest;
use OCP\Util;

/**
 * @template-implements IEventListener<Event|BeforeTemplateRenderedEvent>
 */
class BeforeTemplateRenderedListener implements IEventListener {
	public function __construct(
		private ?string $userId,
		private IRequest $request,
		private IInitialState $initialState,
		private IConfig $config,
		private IAppManager $appManager,
	) {
	}

	public function handle(Event $event): void {
		if (!$event instanceof BeforeTemplateRenderedEvent) {
			return;
		}

		if (!$event->isLoggedIn()) {
			return;
		}

		$path = $this->request->getPathInfo();
		if ($path === false) {
			return;
		}
		$path = explode('/', trim($path, '/'));
		if (!isset($path[0]) || !isset($path[1])) {
			return;
		}
		if ($path[0] !== 'apps' && $path[0] !== 'settings') {
			return;
		}

		$app = $path[1];
		$userConfigValue = $this->config->getUserValue($this->userId, Application::APP_ID, 'introjs-dontShowAgain-' . $app);
		if ($userConfigValue === 'true') { // true => dont show again
			return;
		}

		$serverVersion = (string)Util::getVersion()[0];
		$appVersion = $this->appManager->getAppVersion($app);

		$this->initialState->provideInitialState('introjs-appName', $app);
		$this->initialState->provideInitialState('introjs-appVersion', $appVersion);
		$this->initialState->provideInitialState('introjs-serverVersion', $serverVersion);

		Util::addStyle(Application::APP_ID, Application::APP_ID . '-main');
		Util::addScript(Application::APP_ID, Application::APP_ID . '-main');
	}
}
