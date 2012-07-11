/*
 *  This file is part of AtlasMapper server and clients.
 *
 *  Copyright (C) 2012 Australian Institute of Marine Science
 *
 *  Contact: Gael Lafond <g.lafond@aims.org.au>
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

package au.gov.aims.atlasmapperserver.layerGenerator;

import au.gov.aims.atlasmapperserver.ClientConfig;
import au.gov.aims.atlasmapperserver.dataSourceConfig.BingDataSourceConfig;
import au.gov.aims.atlasmapperserver.layerConfig.BingLayerConfig;

import java.util.HashMap;
import java.util.Map;

public class BingLayerGenerator extends AbstractLayerGenerator<BingLayerConfig, BingDataSourceConfig> {
	// The layers do not changes often enough to develop some sort of parser.
	private static Map<String, BingLayerConfig> bingLayersCache = null;

	/**
	 * The number of Bing Layers is fix and they already have unique IDs. Nothing to do here.
	 * @param layer
	 * @param dataSourceConfig
	 * @return
	 */
	@Override
	protected String getUniqueLayerId(BingLayerConfig layer, BingDataSourceConfig dataSourceConfig) {
		return layer.getLayerId();
	}

	/**
	 * Create and return the 3 Bing layers.
	 *     * Bing Road
	 *     * Bing Hybrid
	 *     * Bing Aerial
	 * @param clientConfig
	 * @return
	 */
	@Override
	public Map<String, BingLayerConfig> generateLayerConfigs(ClientConfig clientConfig, BingDataSourceConfig dataSourceConfig) {
		if (bingLayersCache == null) {
			bingLayersCache = new HashMap<String, BingLayerConfig>();

			BingLayerConfig road = this.createBingLayer(dataSourceConfig, "Road", "Bing Road", null);
			bingLayersCache.put(road.getLayerId(), road);

			BingLayerConfig roadmap = this.createBingLayer(dataSourceConfig, "AerialWithLabels", "Bing Hybrid", null);
			bingLayersCache.put(roadmap.getLayerId(), roadmap);

			BingLayerConfig satellite = this.createBingLayer(dataSourceConfig, "Aerial", "Bing Aerial", null);
			bingLayersCache.put(satellite.getLayerId(), satellite);
		}
		return bingLayersCache;
	}

	@Override
	public BingDataSourceConfig applyOverrides(BingDataSourceConfig dataSourceConfig) {
		return dataSourceConfig;
	}

	private BingLayerConfig createBingLayer(BingDataSourceConfig dataSourceConfig, String bingLayerType, String name, String description) {
		BingLayerConfig layerConfig = new BingLayerConfig(dataSourceConfig.getConfigManager());
		layerConfig.setDataSourceId(dataSourceConfig.getDataSourceId());

		layerConfig.setLayerId(bingLayerType);
		layerConfig.setTitle(name);
		layerConfig.setDescription(description);
		layerConfig.setIsBaseLayer(true);
		layerConfig.setLayerBoundingBox(new double[]{-180, -90, 180, 90});

		this.ensureUniqueLayerId(layerConfig, dataSourceConfig);

		return layerConfig;
	}
}