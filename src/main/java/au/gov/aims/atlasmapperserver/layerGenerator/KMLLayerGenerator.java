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

package au.gov.aims.atlasmapperserver.layerGenerator;

import au.gov.aims.atlasmapperserver.URLCache;
import au.gov.aims.atlasmapperserver.Utils;
import au.gov.aims.atlasmapperserver.dataSourceConfig.KMLDataSourceConfig;
import au.gov.aims.atlasmapperserver.layerConfig.KMLLayerConfig;
import au.gov.aims.atlasmapperserver.layerConfig.LayerCatalog;
import au.gov.aims.atlasmapperserver.thread.ThreadLogger;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URL;
import java.util.logging.Level;

public class KMLLayerGenerator extends AbstractLayerGenerator<KMLLayerConfig, KMLDataSourceConfig> {
    /**
     * We thrust the Admin to choose Unique IDs for all it's KMLs. Nothing to do here.
     * @param layer
     * @param dataSourceConfig
     * @return
     */
    @Override
    protected String getUniqueLayerId(KMLLayerConfig layer, KMLDataSourceConfig dataSourceConfig) {
        return layer.getLayerId();
    }

    /**
     * NOTE: Clear cache flags are ignored since there is nothing to cache.
     * @param dataSourceConfig
     * @return
     */
    @Override
    public LayerCatalog generateRawLayerCatalog(ThreadLogger logger, KMLDataSourceConfig dataSourceConfig, boolean redownloadPrimaryFiles, boolean redownloadSecondaryFiles) {
        LayerCatalog layerCatalog = new LayerCatalog();

        JSONArray kmlData = dataSourceConfig.getKmlData();
        if (kmlData != null && kmlData.length() > 0) {
            for (int i=0, len=kmlData.length(); i<len; i++) {
                JSONObject kmlInfo = kmlData.optJSONObject(i);
                if (kmlInfo != null) {
                    KMLLayerConfig layer = new KMLLayerConfig(dataSourceConfig.getConfigManager());
                    String kmlId = kmlInfo.optString("id", null);

                    layer.setLayerId(kmlId);
                    layer.setTitle(kmlInfo.optString("title", null));

                    String description = kmlInfo.optString("description", null);
                    if (description != null) {
                        layer.setDescription(description);
                        layer.setDescriptionFormat("wiki");
                    }

                    // Do not call ensure unique layer ID, we thrust the admin to choose unique ID.
                    //this.ensureUniqueLayerId(layer, dataSourceConfig);

                    // Validate the URL, show a warning if not valid, add layer if valid.
                    String urlStr = kmlInfo.optString("url", null);
                    if (Utils.isBlank(urlStr)) {
                        logger.log(Level.WARNING, String.format("Invalid entry for KML id %s: The KML URL field is mandatory.",
                                kmlId));
                    } else {
                        URL url = null;
                        try {
                            url = Utils.toURL(urlStr);
                        } catch(Exception ex) {
                            logger.log(Level.WARNING, String.format("Invalid entry for KML id %s: The KML url %s is not valid.%n%s",
                                    kmlId, urlStr, Utils.getExceptionMessage(ex)));
                        }

                        if (url != null) {
                            if (redownloadPrimaryFiles) {
                                URLCache.ResponseStatus responseStatus = URLCache.getResponseStatus(url.toString());
                                Integer statusCode = responseStatus.getStatusCode();
                                if (responseStatus.getErrorMessage() != null) {
                                    logger.log(Level.WARNING, String.format("Invalid entry for KML id %s: The KML url %s is not accessible. Please look for typos.%n%s",
                                            kmlId, urlStr, responseStatus.getErrorMessage()));
                                } else {
                                    if (statusCode == null) {
                                        // This should not happen; the statusCode is never null when there is no error message.
                                        logger.log(Level.WARNING, String.format("Invalid entry for KML id %s: The KML url %s could not be downloaded.",
                                                kmlId, urlStr));
                                    } else {
                                        if (statusCode >= 200 && statusCode < 300) {
                                            layer.setKmlUrl(url.toString());
                                            // Add the layer only if its configuration is valid
                                            layerCatalog.addLayer(layer);
                                        } else {
                                            logger.log(Level.WARNING, String.format("Invalid entry for KML id %s: The KML url %s returned the status code %d.",
                                                    kmlId, urlStr, statusCode));
                                        }
                                    }
                                }
                            } else {
                                layer.setKmlUrl(url.toString());

                                // Add the layer only if its configuration is valid
                                layerCatalog.addLayer(layer);
                            }
                        }
                    }
                }
            }
        }

        return layerCatalog;
    }
}
