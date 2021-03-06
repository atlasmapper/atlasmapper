/*
 *  This file is part of AtlasMapper server and clients.
 *
 *  Copyright (C) 2012 Australian Institute of Marine Science
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
import au.gov.aims.atlasmapperserver.jsonWrappers.client.LayerWrapper;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.logging.Logger;

/**
 * Class used to hold a list of all layers for a data source, before and after manual overrides.
 */
public class LayerCatalog {
    private static final Logger LOGGER = Logger.getLogger(LayerCatalog.class.getName());

    private SortedSet<AbstractLayerConfig> layers;

    public LayerCatalog() {
        // Instantiate a TreeSet, using a comparator that sort layers in alphabetical order.
        this.layers = new TreeSet<AbstractLayerConfig>(new LayerComparator());
    }

    public boolean isEmpty() {
        return this.layers.isEmpty();
    }

    public void addCatalog(LayerCatalog catalog) {
        this.addLayers(catalog.getLayers());
    }

    public void addLayer(AbstractLayerConfig newLayer) {
        if (newLayer != null) {
            this.layers.add(newLayer);
        }
    }

    public void addLayers(Collection<? extends AbstractLayerConfig> newLayers) {
        if (newLayers != null && !newLayers.isEmpty()) {
            this.layers.addAll(newLayers);
        }
    }

    public List<AbstractLayerConfig> getLayers() {
        return new ArrayList<AbstractLayerConfig>(this.layers);
    }

    // Helper
    public static AbstractLayerConfig createLayer(String layerType, LayerWrapper layerConfigJSON, ConfigManager configManager) throws JSONException {
        if (layerType == null) {
            // Unsupported
            throw new IllegalArgumentException("Layer not found:\n" + layerConfigJSON.getJSON().toString(4));
        }

        AbstractLayerConfig layerConfig = null;
        if ("ARCGIS_MAPSERVER".equals(layerType)) {
            layerConfig = new ArcGISMapServerLayerConfig(configManager);
        } else if ("GOOGLE".equals(layerType)) {
            layerConfig = new GoogleLayerConfig(configManager);
        } else if ("BING".equals(layerType)) {
            layerConfig = new BingLayerConfig(configManager);
        } else if ("KML".equals(layerType)) {
            layerConfig = new KMLLayerConfig(configManager);
        } else if ("NCWMS".equals(layerType)) {
            layerConfig = new NcWMSLayerConfig(configManager);
        } else if ("THREDDS".equals(layerType)) {
            layerConfig = new ThreddsLayerConfig(configManager);
        } else if ("TILES".equals(layerType)) {
            layerConfig = new TilesLayerConfig(configManager);
        } else if ("XYZ".equals(layerType)) {
            layerConfig = new XYZLayerConfig(configManager);
        } else if ("WMS".equals(layerType)) {
            layerConfig = new WMSLayerConfig(configManager);
        } else if ("GROUP".equals(layerType) || "SERVICE".equals(layerType)) {
            layerConfig = new GroupLayerConfig(configManager);
        } else {
            // Unsupported
            throw new IllegalArgumentException("Unsupported data source layer type [" + layerType + "]");
        }

        // Set all data source values into the data source bean
        if (layerConfig != null) {
            layerConfig.update(layerConfigJSON.getJSON());
        }

        return layerConfig;
    }
}
