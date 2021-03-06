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

Ext.namespace("Atlas");

Atlas.MapPanel = Ext.extend(GeoExt.MapPanel, Atlas.AbstractMapPanel);
Atlas.MapPanel.prototype.embedded = true;

/*
// Namespace declaration (equivalent to Ext.namespace("Atlas");)
window["Atlas"] = window["Atlas"] || {};

Atlas.MapPanel = OpenLayers.Class(Atlas.AbstractMapPanel, {
	initialize: function(config) {
		for (att in config) {
			if (config.hasOwnProperty(att)) {
				this[att] = config[att];
			}
		}

		this.initComponent();
	}
});
*/

// TODO The Embedded window is currently using the ExtJS. When this will be fix, the following message will have to be moved to an other library.
Atlas.MapPanel.prototype.missingLayersCallback = function(missingLayerIds) {
	Ext.Msg.alert('Error', 'The application has failed to load the following layers:<ul class="bullet-list"><li>' + missingLayerIds.join('</li><li>') + '</li></ul>');
};
