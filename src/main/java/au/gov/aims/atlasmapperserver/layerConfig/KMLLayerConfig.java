/*
 *  This file is part of AtlasMapper server and clients.
 *
 *  Copyright (C) 2011 Australian Institute of Marine Science
 *
 *  Contact: Gael Lafond <g.lafond@aims.gov.au>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package au.gov.aims.atlasmapperserver.layerConfig;

import au.gov.aims.atlasmapperserver.ConfigManager;
import au.gov.aims.atlasmapperserver.annotation.ConfigField;

public class KMLLayerConfig extends AbstractLayerConfig {
	@ConfigField
	private String kmlUrl;

	public KMLLayerConfig(ConfigManager configManager) {
		super(configManager);

		// By default, disable KML legend.
		// KML legend are really bad...
		if (this.isHasLegend() == null) {
			this.setHasLegend(false);
		}
	}

	public String getKmlUrl() {
		return kmlUrl;
	}

	public void setKmlUrl(String kmlUrl) {
		this.kmlUrl = kmlUrl;
	}
}
