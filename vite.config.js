/**
 * SPDX-FileCopyrightText: 2025 Framasoft <https://framasoft.org>
 * SPDX-FileContributor: Thomas Citharel <thomas.citharel@framasoft.org>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createAppConfig } from '@nextcloud/vite-config'

export default createAppConfig({
	// entry points: {name: script}
	main: 'src/main.js',
	adminSettings: 'src/adminSettings.js',
})
