<?php

namespace OCA\Intros\Settings;

use OCA\Intros\AppInfo\Application;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Settings\ISettings;
use OCP\Util;

class Admin implements ISettings {

	/**
	 * @return TemplateResponse
	 */
	public function getForm(): TemplateResponse {
		Util::addStyle(Application::APP_ID, Application::APP_ID . '-adminSettings');
		Util::addScript(Application::APP_ID, Application::APP_ID . '-adminSettings');
		return new TemplateResponse(Application::APP_ID, 'adminSettings');
	}

	public function getSection(): string {
		return Application::APP_ID;
	}

	public function getPriority(): int {
		return 10;
	}
}
