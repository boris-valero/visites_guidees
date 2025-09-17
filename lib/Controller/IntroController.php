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
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\RedirectResponse;

use OCP\IRequest;
use OCP\IURLGenerator;

class IntroController extends Controller {

	public function __construct(
		string $appName,
		IRequest $request,
		private IURLGenerator $urlGenerator,
	) {
		parent::__construct($appName, $request);
	}

	/**
	 * Redirects the user to the intros settings section
	 *
	 * @return RedirectResponse<Http::STATUS_SEE_OTHER, array{}>
	 *
	 * @IgnoreOpenAPI
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function redirectToIntroOptions(): RedirectResponse {
		$url = $this->urlGenerator->linkToRouteAbsolute('settings.PersonalSettings.index', ['section' => Application::APP_ID]);
		return new RedirectResponse($url);
	}
}
