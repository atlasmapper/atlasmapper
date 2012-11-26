<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<!--
 *  This file is part of AtlasMapper server and clients.
 *
 *  Copyright (C) 2011 Australian Institute of Marine Science
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
-->
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">

<!-- Generated with AtlasMapper version ${version} -->
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=EmulateIE8" />
	<!-- IE9 is not support by GeoExt yet, the emulation mode is supposed to fix this...
		IMPORTANT!!! The IE-EmulateIE8 MUST be the first line of the header otherwise IE9 ignore it. -->

	<title>${clientName}</title>
	<link rel="icon" type="image/png" href="resources/favicon.png?atlasmapperVer=${version}" />
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />

	<#if (theme?? && theme != "")>
		<link rel="stylesheet" type="text/css" href="extjs/3.3.0/ext-3.3.0/resources/css/ext-all-notheme.css?atlasmapperVer=${version}" />
		<link rel="stylesheet" type="text/css" href="extjs/3.3.0/ext-3.3.0/resources/css/${theme}.css?atlasmapperVer=${version}" />
	<#else>
		<link rel="stylesheet" type="text/css" href="extjs/3.3.0/ext-3.3.0/resources/css/ext-all.css?atlasmapperVer=${version}" />
	</#if>

	<link rel="stylesheet" type="text/css" href="resources/css/styles.css?atlasmapperVer=${version}" />
	<!--[if lte IE 6 ]>
		<link rel="stylesheet" type="text/css" href="resources/css/styles-ie6.css?atlasmapperVer=${version}" />
	<![endif]-->

	<#if (headExtra?? && headExtra != "")>
		${headExtra}
	</#if>
</head>

<body id="previewClient">
	<div id="loading"></div>

	<div id="welcomeMsg">
		${welcomeMsg!''}
	</div>
	<noscript>
		<hr/>
		<p class="noJavaScript">
			Error: <strong>JavaScript is disabled</strong>.<br/>
			You need to have <em>JavaScript enabled</em> to use the Map.
		</p>
	</noscript>
	<script type="text/javascript">
		var loadingObj = document.getElementById('loading');
		loadingObj.style.display = 'block';

		var welcomeMsgObj = document.getElementById('welcomeMsg');
		// NOTE: Visibility: hidden reserve a space to render the object.
		welcomeMsgObj.style.display = 'none';
	</script>

	<!-- IE 9+ conditional comment - this will only be executed by IE 9 and above. -->
	<!--[if gte IE 9]>
	<script type="text/javascript">
		var ie9plus = true;
	</script>
	<![endif]-->

	<script type="text/javascript" src="OpenLayers/OpenLayers-2.12/OpenLayers.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="OpenLayers-ux/PrintFrame.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="OpenLayers-ux/SearchResults.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="OpenLayers-ux/NCWMS.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="OpenLayers-ux/NCTimeSeriesClickControl.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="OpenLayers-ux/NCTransectDrawControl.js?atlasmapperVer=${version}"></script>

	<!-- OpenLayers support for Google layer, in version <= 2.11, has to be patched to support V > 3.6
			(since google do not support V <= 3.6 anymore)
		Bug: http://trac.osgeo.org/openlayers/ticket/3614
		Patch: https://github.com/openlayers/openlayers/commit/92f04a7a4277a6c818ef2d40a2856910ed72d3d6
		Date: 18-05-2012
	-->
	<!-- <script type="text/javascript" src="OpenLayers-ux/Google-v3.js?atlasmapperVer=${version}"></script> -->

	<#if (useGoogle)>
		<!-- If the client use any Google Layers -->
		<script type="text/javascript" src="http://maps.google.com/maps/api/js?v=3.7&amp;sensor=false&amp;atlasmapperVer=${version}"></script>
	</#if>

	<script type="text/javascript" src="extjs/3.3.0/ext-3.3.0/adapter/ext/ext-base-debug.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="extjs/3.3.0/ext-3.3.0/ext-all-debug.js?atlasmapperVer=${version}"></script>
	<!-- The un-minimized version (in folder lib) do not works with FF4 (it's components are loaded async) -->
	<!--<script type="text/javascript" src="GeoExt/lib/GeoExt.js?atlasmapperVer=${version}"></script> -->
	<script type="text/javascript" src="GeoExt/script/GeoExt.js?atlasmapperVer=${version}"></script>

	<!-- Personal addition to ExtJS -->
	<script type="text/javascript" src="Ext-ux/CompositeFieldAnchor.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="Ext-ux/IFramePanel.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="Ext-ux/MinMaxField.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="Ext-ux/DateField.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="Ext-ux/NCDatetimeField.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="Ext-ux/NCPlotPanel.js?atlasmapperVer=${version}"></script>

	<!-- Personal addition to GeoExt -->
	<script type="text/javascript" src="GeoExt-ux/LayerLegend.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/WMSLegend.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/NCWMSLegend.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/VectorLegend.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/LegendImage.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/LegendGroup.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/GroupLayerOpacitySlider.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="GeoExt-ux/GroupLayerLoader.js?atlasmapperVer=${version}"></script>

	<script type="text/javascript" src="modules/Utils/WikiFormater.js?atlasmapperVer=${version}"></script>

	<script type="text/javascript" src="modules/Core/Core.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/Layer/LayerState.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/Layer/AbstractLayer.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/ArcGISMapServer.js?atlasmapperVer=${version}"></script>
			<script type="text/javascript" src="modules/MapPanel/Layer/ArcGISCache.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/Dummy.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/Group.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/Google.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/Bing.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/KML.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/PrintFrame.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/SearchResults.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/WMS.js?atlasmapperVer=${version}"></script>
			<script type="text/javascript" src="modules/MapPanel/Layer/NCWMS.js?atlasmapperVer=${version}"></script>
			<script type="text/javascript" src="modules/MapPanel/Layer/WMTS.js?atlasmapperVer=${version}"></script>
		<script type="text/javascript" src="modules/MapPanel/Layer/XYZ.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/Layer/LayerHelper.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/AbstractMapPanel.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/GeoExtMapPanel.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/MapPanel/GetFeatureInfo.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Legend/Legend.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Legend/LegendPanel.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/LayersPanel/LayersPanel.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/LayersPanel/AddLayersWindow.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Trees/Trees.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Trees/LayerTreeLoader.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Trees/LayerNode.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Info/Info.js?atlasmapperVer=${version}"></script>
	<script type="text/javascript" src="modules/Info/OptionsPanel.js?atlasmapperVer=${version}"></script>

	<script type="text/javascript">

		var parameters = OpenLayers.Util.getParameters();

		// Multi-maps
		var nbMaps = 1;
		if (parameters.maps) {
			nbMaps = parseInt(parameters.maps);
		}
		if (nbMaps < 1) { nbMaps = 1; }
		if (nbMaps > 4) { nbMaps = 4; }

		var intro = true;
		if (parameters.intro) {
			intro = (parameters.intro.toLowerCase() === 'true');
		}

		// This is the preview: Always download the config (no cache)
		var timestamp = new Date().getTime();

		Ext.onReady(function() {
			if (intro) {
				var showWelcomeWindow = function() {
					var welcomeMsg = welcomeMsgObj.innerHTML;
					if (typeof(welcomeMsg.trim) === 'function') {
						welcomeMsg = welcomeMsg.trim();
					} else {
						welcomeMsg = welcomeMsg.replace(/^\s+/,'').replace(/\s+$/,'');
					}

					if (welcomeMsg) {
						// Some ExtJS element may steal this window focus (such as the legend). Animal said that this bug is fixed in ExtJS 4
						Ext.Msg.show({
							title:'Welcome',
							msg: welcomeMsg,
							cls: 'welcomeCls',
							minWidth: 500,
							buttons: Ext.Msg.OK
						});
					}
				};

				if (typeof(ie9plus) !== 'undefined' && ie9plus === true) {
					// This Warning window will only show up if IE is not running in comptability mode (if it ignores the directive in the header)
					Ext.Msg.show({
						title:'WARNING',
						msg: '<p>Your browser is not well supported. It\'s strongly recommended to activate the browser compatibility mode!</p><img src="resources/images/IE9-compatibility-mode.png">',
						cls: 'welcomeCls',
						width: 750,
						minWidth: 750,
						buttons: Ext.Msg.OK,
						icon: Ext.MessageBox.WARNING,
						fn: showWelcomeWindow
					});
				} else {
					showWelcomeWindow();
				}
			}

			Atlas.core = new Atlas.Core("/atlasmapper/public/layersInfo.jsp?client=${clientId}&action=GET_LIVE_CONFIG", null, timestamp, true);
			Atlas.core.afterLoad = function() {
				document.getElementById('loading').style.display = 'none';

				mapLayoutItems = [];
				for (var i=0; i<nbMaps; i++) {
					var mapPanel = Atlas.core.createNewMapPanel();
					new Atlas.Legend({mapPanel: mapPanel});

					mapLayoutItems.push(
						{
							flex: 1,
							layout: "border",
							deferredRender: false,
							items: [
								mapPanel,
								new Atlas.LayersPanel({
									minWidth: 180,
									mapPanel: mapPanel,
									region: 'west'
								})
							]
						}
					);
				}

				new Ext.Viewport({
					layout: "border",
					hideBorders: true,
					items: [
						<#if (pageHeader?? && pageHeader != "")>
							{
								region: 'north',
								html: "${pageHeader}"
							},
						</#if>
						{
							region: 'center',
							layout: "hbox",
							layoutConfig: {
								align : 'stretch',
								pack  : 'start'
							},
							hideBorders: true,
							items: mapLayoutItems
						}
						<#if (pageFooter?? && pageFooter != "")>
							,{
								region: 'south',
								html: "${pageFooter}"
							}
						</#if>
					]
				});
			};

			Ext.QuickTips.init();
		});
	</script>
</body>

</html>
