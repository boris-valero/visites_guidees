<?php

/**
 * @copyright Copyright (c) 2024 Val Jossic <val@framasoft.org>
 *
 * @author Val Jossic <val@framasoft.org>
 *
 * @license AGPL-3.0-or-later
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

namespace OCA\Intros\Controller;

use OCA\Intros\AppInfo\Application;
use OCP\App\IAppManager;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\OCSController;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;
use OCP\IUserManager;

class ConfigController extends OCSController {

	public function __construct(
		string $appName,
		IRequest $request,
		private IConfig $config,
		private IL10N $l,
		private IAppManager $appManager,
		private IUserManager $userManager,
		private string $userId,
	) {
		parent::__construct($appName, $request);
	}

	/**
	 * Save a pair of key, value to the current user's config
	 *
	 * @param string $key the key to save
	 * @param string $value the value to save
	 * @return DataResponse<Http::STATUS_OK, array{message: string}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	public function saveConfig(string $key, string $value): DataResponse {
		$this->config->setUserValue($this->userId, Application::APP_ID, $key, $value);
		return new DataResponse([
			'message' => $this->l->t('Saved!'),
		]);
	}

	/**
	 * Save multiple pairs of key, value to the current user's config
	 *
	 * @param array<string, string> $appConfigs
	 * @return DataResponse<Http::STATUS_OK, array{message: string}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	public function saveConfigs(array $appConfigs): DataResponse {
		foreach ($appConfigs as $key => $value) {
			$this->saveConfig($key, $value);
		}
		return new DataResponse([
			'message' => $this->l->t('Saved!')
		]);
	}

	/**
	 * Get the config value of the current user for the corresponding key
	 *
	 * @param string $key the key to search
	 * @return DataResponse<Http::STATUS_OK, array{value: string, userid: string}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function getConfig(string $key): DataResponse {
		$configValue = $this->config->getUserValue($this->userId, Application::APP_ID, $key);

		return new DataResponse([
			'value' => $configValue,
			'userid' => $this->userId,
		]);
	}

	/**
	 * Get all the config values of the current user
	 *
	 * @return DataResponse<Http::STATUS_OK, array{values: array<string, mixed>, userid: string}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function getConfigs(): DataResponse {
		$configValues = $this->config->getAllUserValues($this->userId);

		return new DataResponse([
			'values' => $configValues[Application::APP_ID],
			'userid' => $this->userId,
		]);
	}

	/**
	 * Get a list of the current user's enabled apps
	 *
	 * @return DataResponse<Http::STATUS_OK, array{apps: string[]}, array<string, mixed>>|DataResponse<Http::STATUS_INTERNAL_SERVER_ERROR, array{message: string}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function getEnabledApps(): DataResponse {
		$currentUser = $this->userManager->get($this->userId);
		if ($currentUser == null) {
			return new DataResponse([ 'message' => 'Could not find user' ], Http::STATUS_INTERNAL_SERVER_ERROR);
		}

		$installedApps = $this->appManager->getEnabledAppsForUser($currentUser);

		return new DataResponse([
			'apps' => $installedApps,
		]);
	}
}
