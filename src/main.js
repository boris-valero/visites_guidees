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

import './style.scss'
import { IntroManager, AsideIntroManager } from './introManager.js'
import { getCurrentLanguageIntro, getIntrosStructure, mergeIntrosAndStructure } from './utils.js'
import { loadState } from '@nextcloud/initial-state'

export const APPLICATION_ID = 'intros'
export const INTROS_PATH = 'data/'
export const STRUCTURE_PATH = INTROS_PATH + 'structure/structure.json'

window.onload = async () => {
	if (window.innerWidth < 800 || window.innerHeight < 500) { // ignore smaller screen (lack of readability)
		return
	}

	const app = loadState(APPLICATION_ID, 'introjs-appName')
	const appVersion = loadState(APPLICATION_ID, 'introjs-appVersion')
	const serverVersion = loadState(APPLICATION_ID, 'introjs-serverVersion')
	const options = { appVersion, serverVersion }

	const structure = await getIntrosStructure()
	const intros = await getCurrentLanguageIntro()

	// after fetching the intros and structure objects, merge them into the same intros object
	mergeIntrosAndStructure(intros, structure, options)

	const tabAsides = [] // intros in aside tabs
	const asides = [] // intros in aside (should only be one)
	Object.keys(intros).forEach(key => {
		if (key.match(`^${app}-aside-.*$`)) {
			tabAsides.push(key)
		} else if (key.match(`^${app}-aside$`)) {
			asides.push(key)
		}
	})

	setTimeout(() => {
		new IntroManager(app, intros).run()
		for (const aside of tabAsides) {
			new AsideIntroManager(aside, intros, true).runAside()
		}
		for (const aside of asides) {
			new AsideIntroManager(aside, intros).runAside()
		}
	}, 100) // wait a bit for all content to load
}
