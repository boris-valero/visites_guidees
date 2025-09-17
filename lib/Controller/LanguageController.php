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
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\OCSController;
use OCP\Exceptions\AppConfigTypeConflictException;
use OCP\IAppConfig;
use OCP\IRequest;

class LanguageController extends OCSController {
	public const DEFAULT_AVAILABLE_LANG = 'en,fr';

	public function __construct(
		string $appName,
		IRequest $request,
		private IAppConfig $config,
	) {
		parent::__construct($appName, $request);
	}

	/**
	 * Gets all the available languages for the current user
	 *
	 * @return DataResponse<Http::STATUS_OK, array{languages: string[]}, array<string, mixed>>
	 *
	 * @IgnoreOpenAPI
	 * @throws AppConfigTypeConflictException
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function getAvailableLanguages(): DataResponse {
		$languages = $this->config->getValueString(Application::APP_ID, 'introsLanguages', self::DEFAULT_AVAILABLE_LANG);
		$languages = explode(',', $languages); // transform the string representation back into an array

		return new DataResponse([
			'languages' => $languages
		]);
	}
}
