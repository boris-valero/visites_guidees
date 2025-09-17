<?php

return [
	'routes' => [
		['name' => 'config#saveConfig', 'url' => '/saveconf', 'verb' => 'PUT'],
		['name' => 'config#saveConfigs', 'url' => '/saveconfs', 'verb' => 'PUT'],
		['name' => 'config#getConfig', 'url' => '/getconf/{key}', 'verb' => 'GET'],
		['name' => 'config#getConfigs', 'url' => '/getconfs', 'verb' => 'GET'],
		['name' => 'config#getEnabledApps', 'url' => '/apps', 'verb' => 'GET'],
		['name' => 'intro#redirectToIntroOptions', 'url' => '/intro', 'verb' => 'GET'],
		['name' => 'language#getAvailableLanguages', 'url' => '/lang', 'verb' => 'GET'],
	],
];
