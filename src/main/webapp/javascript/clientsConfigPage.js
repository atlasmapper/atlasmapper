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
// http://dev.sencha.com/deploy/ext-4.0.2/examples/writer/writer.html

// A function that return a function
// Object can not share the same instance of a function.
// A fresh copy has to be created for each class.

/*
NOTE: Add a button to a grid field (better use a header toolbar...

-- Column item
{
    header: 'Config',
    width: 150,
    sortable: false,
    dataIndex: 'clientId',

    // http://techmix.net/blog/2010/11/25/add-button-to-extjs-gridpanel-cell-using-renderer/
    renderer: function(value, metaData, record) {
        var button = new Ext.Button({
            text: 'Preview',
            //iconCls: IconManager.getIcon('package_add'),
            handler : function(btn, e) {
                // do whatever you want here
            }
        });

        // Generate a new ID
        var newId = Ext.id();
        // Similar to window.setTimeout
        Ext.Function.defer(function() { button.render(document.body, newId); }, 1);

        return '<div id="' + newId + '"></div>';
    }
}
*/

var frameset = null;
var timeoutPerClient = 900000; // 15 minutes

// Define the model for a projection
Ext.regModel('projection', {
    fields: [
        {type: 'string', name: 'name'},
        {type: 'string', name: 'title'}
    ]
});

// The data store holding the projections
var projectionsStore = Ext.create('Ext.data.Store', {
    model: 'projection',
    autoLoad: true,
    proxy: {
        type: 'ajax',
        api: {
            read: 'clientsConfig.jsp?action=GETPROJECTIONS'
        },
        reader: {
            type: 'json',
            successProperty: 'success',
            root: 'data',
            messageProperty: 'message'
        },
        listeners: {
            exception: function(proxy, response, operation){
                var responseObj = null;
                var statusCode = response ? response.status : null;
                if (response && response.responseText) {
                    try {
                        responseObj = Ext.decode(response.responseText);
                    } catch (err) {
                        responseObj = {errors: [err.toString()]};
                    }
                }
                var operStr = 'UNKNOWN';
                if (operation && operation.action) { operStr = operation.action; }
                frameset.setErrors('An error occurred while executing the operation ['+operStr+'] on clients.', responseObj, statusCode);
            }
        }
    }
});

Ext.define('Writer.ClientConfigForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.writerclientconfigform',

    requires: ['Ext.form.field.Text'],

    defaultValues: null,

    initComponent: function(){
        this.defaultValues = Ext.create('Writer.ClientConfig', {
            'projection': 'EPSG:4326',
            'longitude': 0,
            'latitude': 0,
            'zoom': 6,
            'default': false,
            'mainClientEnable': true,
            'mainClientModules': ['Info', 'Tree'], // TODO Delete this once this field is implemented
            'showAddRemoveLayerButtons': true,
            'baseLayersInTab': true,
            'useLayerService': true,

            'searchEnabled': true,
            'showGoogleResults': true,
            'showArcGISResults': false,
            'showOSMResults': true,

            'printEnabled': true,
            'saveMapEnabled': true,
            'mapConfigEnabled': true,
            'mapMeasurementEnabled': true,
            'mapMeasurementLineEnabled': true,
            'mapMeasurementAreaEnabled': true,
            'minimalRegeneration': false,

            'theme': '',
            'enable': true
        });
        this.addEvents('create');

        var mainClientModules = [];
        var embeddedClientModules = [];
        // NOTE: modules variable is set in clientsConfigPage.jsp
        // I don't want to do an Ajax query to get those...
        Ext.iterate(modules, function(moduleId, moduleConfig) {
            mainClientModules.push(Ext.apply({
                name: 'mainClientModules',
                inputValue: moduleId
            }, moduleConfig));
            embeddedClientModules.push(Ext.apply({
                name: 'embeddedClientModules',
                inputValue: moduleId
            }, moduleConfig));
        });

        var browserSpecificEditAreaConfig = {
            xtype: 'editareafield',
            valueType: 'string',
            syntax: 'atlasmapperconfig',
            resizable: true, resizeHandles: 's'
        };
        // As usual, IE required specific workaround. This time, we simply disable the feature.
        if (Ext.isIE) {
            browserSpecificEditAreaConfig = {
                xtype: 'textareafield' // IE takes ages to display the EditArea
            }
        }

        var validateDependencies = function(value) {
            var field = this;
            if (value == '' && field.dependencies) {
                for (var i=0; i < field.dependencies.length; i++) {
                    var dependField = field.up('form').down('#' + field.dependencies[i]);
                    if (dependField != null) {
                        if (dependField.getValue() != '') {
                            return '<i>' + (field.fieldLabel ? field.fieldLabel : field.getName()) + '</i> can not be empty when <i>' + (dependField.fieldLabel ? dependField.fieldLabel : dependField.getName()) + '</i> is not empty.';
                        }
                    }
                }
            }
            return true;
        };

        var notAvailableInDemoMode = demoMode ? "<br/><strong>This function is not available in the Demo version.</strong>" : "";

        var generatedFileLocationId = Ext.id();
        var baseUrlId = Ext.id();

        /** Define the Data sources grid, with an empty store - The store is filled when an entity is loaded **/

        this.dataSourcesStore = Ext.create('Ext.data.Store', {
            xtype: 'store',
            storeId: 'dataSourcesStore',
            fields: [
                'id',
                {name: 'title', sortType: 'asUCString'},
                'status',
                {name: 'checked', type: 'boolean'}
            ],
            sorters: {
                property: 'title',
                direction: 'ASC'
            },
            // "data" is loaded by this.setActiveRecord(record), called by the action of the "Edit" / "Add" buttons of the data source's grid.
            data: []
        });
        var dataSourcesGrid = Ext.create('Ext.grid.Panel', {
            fieldLabel: 'Data sources',
            qtipHtml: 'List of Data sources.',
            name: 'dataSourcesGrid',
            bodyPadding: 0,
            border: false,
            title: 'Data sources',
            store: this.dataSourcesStore,
            columns: [
                { xtype: 'checkcolumn', dataIndex: 'checked', width: 30, hideable: false },
                { dataIndex: 'status', width: 30, hideable: false },
                { text: 'ID',  dataIndex: 'id' },
                { text: 'Type', dataIndex: 'type', hidden: true },
                { text: 'Name', dataIndex: 'title', flex: 1 }
            ]
        });

        Ext.apply(this, {
            activeRecord: null,
            border: false,
            fieldDefaults: {
                msgTarget: 'side', // Display an (X) icon next to the field when it's not valid
                qtipMaxWidth: 200,
                anchor: '100%',
                labelAlign: 'right',
                labelWidth: 150
            },
            items: [{
                xtype: 'tabpanel',
                border: false,
                height: '100%', width: '100%',
                defaults: {
                    layout: 'anchor',
                    autoScroll: true,
                    border: false,
                    bodyPadding: 5,
                    defaultType: 'textfield'
                },
                items: [
                    {
                        // Normal config options
                        title: 'General',
                        defaults: {
                            hideEmptyLabel: false
                        },
                        items: [
                            {
                                // Grids records must have an unmutable ID
                                name: 'id',
                                xtype: 'hiddenfield'
                            }, {
                                boxLabel: 'Enable this client',
                                qtipHtml: 'If this box is unchecked, the AtlasMapper will return 404 (Not found) when a user try to access the mapping client. Note that this feature only works with clients hosts by the AtlasMapper server.',
                                name: 'enable',
                                xtype: 'checkboxfield'
                            }, {
                                fieldLabel: 'Client ID',
                                name: 'clientId',
                                qtipHtml: 'This field is used for the client folder and as a reference in this interface, for the administrator.',
                                xtype: 'ajaxtextfield',
                                ajax: {
                                    url: 'clientsConfig.jsp',
                                    params: {
                                        action: 'validateId',
                                        'jsonResponse': true
                                    },
                                    formValues: ['id'], formPanel: this
                                },
                                allowBlank: false
                            }, {
                                fieldLabel: 'Client Name',
                                name: 'clientName',
                                qtipHtml: 'A human readable name for this client. This field is used as a title for the Atlas Mapper client and in error/warning messages.'
                            }, {
                                title: 'Modules for the main client(s)',
                                qtipTitle: 'Main client',
                                qtipHtml: 'Selected modules will appear in the main client.',
                                checkboxToggle: true,
                                checkboxName: 'mainClientEnable',
                                xtype:'fieldsetresize',
                                defaultType: 'textfield',
                                collapsible: true,
                                collapsed: true,
                                hidden: true, // TODO Delete this once this field is implemented
                                items: [
                                    {
                                        xtype: 'checkboxgroup',
                                        columns: 2,
                                        items: mainClientModules
                                    }
                                ]
                            }, {
                                title: 'Modules for the embedded client(s)',
                                qtipTitle: 'Embedded client',
                                qtipHtml: 'Selected modules will appear in the embedded client.',
                                checkboxToggle: true,
                                checkboxName: 'embeddedClientEnable',
                                xtype:'fieldsetresize',
                                defaultType: 'textfield',
                                collapsible: true,
                                collapsed: true,
                                hidden: true, // TODO Delete this once this field is implemented
                                items: [
                                    {
                                        xtype: 'checkboxgroup',
                                        columns: 2,
                                        items: embeddedClientModules
                                    }
                                ]
                            }, {
                                fieldLabel: 'Projection (<a href="http://spatialreference.org/" target="_blank">?</a>)',
                                qtipTitle: 'Projection',
                                qtipHtml: 'Projection for this client. Default is <em>EPSG:4326</em>. See the spatial reference Web Site for more info.',
                                name: 'projection',
                                xtype: 'combobox',
                                editable: false,
                                //forceSelection: true, // Force the user to choose something from the list (do not allow random value)
                                valueField: 'name',
                                displayField: 'title',
                                allowBlank: false,
                                store: projectionsStore,
                                queryMode: 'local'
                            }, {
                                fieldLabel: 'Save states',
                                qtipHtml: 'Save states... - TODO -',
                                name: 'saveStates',
                                hidden: true, // TODO Delete this once this field is implemented
                                xtype: 'displayfield',
                                value: 'Grid of all save states, allow user to view, modify, delete, choose de default one'
                            }, {
                                xtype: 'fieldcontainer',
                                fieldLabel: 'Starting Location',
                                qtipHtml: 'The starting location of the map. Longitude and latitude indicate the centre of the map and the zoom indicate the resolution;<br/>'+
                                    '<ul>'+
                                        '<li>0 for a resolution of 1:221M</li>'+
                                        '<li>1 for a resolution of 1:111M</li>'+
                                        '<li>...</li>'+
                                        '<li>15 for a resolution of 1:6759</li>'+
                                    '</ul>'+
                                    'Example: longitude: 148.0, latitude: -18.0, zoom: 6',
                                combineErrors: true,
                                msgTarget: 'side',
                                layout: 'hbox',
                                defaults: {
                                    xtype: 'numberfield',
                                    // Remove spinner buttons, and arrow key and mouse wheel listeners
                                    hideTrigger: true,
                                    keyNavEnabled: false,

                                    labelWidth: 35,
                                    margin: '0 0 0 5',
                                    flex: 1
                                },
                                items: [
                                    {
                                        name: 'longitude',
                                        fieldLabel: 'Lon',
                                        decimalPrecision: 5
                                    }, {
                                        name: 'latitude',
                                        fieldLabel: 'Lat',
                                        decimalPrecision: 5
                                    }, {
                                        name: 'zoom',
                                        fieldLabel: 'Zoom',
                                        allowDecimals: false
                                    }
                                ]
                            }, {
                                fieldLabel: 'Default Layers',
                                qtipHtml: 'List of layer ids, separated by coma or new line. The list define the layers that come up when the client is loaded.',
                                name: 'defaultLayers',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 75
                            }, {
                                fieldLabel: 'Comment',
                                qtipHtml: 'Comment for administrators. This field is not display anywhere else.',
                                name: 'comment',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 50
                            }
                        ]
                    },
                    dataSourcesGrid,
                    {
                        // Advanced config options
                        title: 'Advanced',
                        defaults: {
                            hideEmptyLabel: false
                        },
                        items: [
                            Ext.apply({
                                    fieldLabel: 'Layers\' manual override (<a href="manualOverrideDoc.html" target="_blank">doc</a>)',
                                    qtipTitle: 'Layers\' manual override',
                                    qtipHtml: 'JSON configuration used to override the layers information retrieved from the GetCapabilities documents. These changes only affect the current client. They are apply over the <i>Layers\' global manual override</i> of the <i>Global configuration</i>.<br/>See the documentation for more information.',
                                    vtype: 'jsonfield',
                                    name: 'manualOverride',
                                    height: 300
                                }, browserSpecificEditAreaConfig
                            ), {
                                fieldLabel: 'Black/White layer filter',
                                qtipHtml: 'List of layer ids or id patterns, separated by coma or new line. A star (<b>*</b>) can be used as a wild card, anywhere in the id string. More than one star can be used.<br/><br/>'+
                                        'Ids that start with a minus (<b>-</b>) are <b>black listed</b> (removed), and those starting with a plus (<b>+</b>) are <b>white listed</b> (added). '+
                                        'The AtlasMapper server does not generate any layer information for any black listed layers, so they are invisible for the AtlasMapper clients.<br/><br/>' +
                                        'Initially all layers are included, then the filters are applied to this list.<br/><br/>' +
                                        '<b>Example:</b> This filter will remove all <i>ea_</i> layers that do not start with <i>ea_base</i>, and will also remove the one starting with <i>ea_baselayer</i>:<br/>' +
                                        '<pre>    -ea_*\n    +ea_base*\n    -ea_baselayer*</pre>',
                                name: 'blackAndWhiteListedLayers',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 100
                            }, {
                                // For special GeoServer legend params, see:
                                // http://docs.geoserver.org/latest/en/user/services/wms/get_legend_graphic/legendgraphic.html#raster-legends-explained
                                fieldLabel: 'Legend parameters',
                                qtipHtml: 'List of URL parameters <i>key=value</i>, separated by coma or new line. Those parameters are added to the URL sent to request the legend graphics.',
                                name: 'legendParameters',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 100
                            }, {
                                fieldLabel: 'Proxy URL',
                                qtipHtml: 'The AtlasMapper clients have to send Ajax request (using javascript) for different features such as <em>feature requests</em>. '+
                                    'This server application is bundle with such a proxy.<br/>'+
                                    '<ul>'+
                                        '<li>If you want to use the integrated proxy, <strong>leave this field blank</strong>.</li>'+
                                        '<li>If you want to use a standalone proxy, you can use the one provided by OpenLayer in their example folder. In this case, the URL should looks like this:<br/><em>/cgi-bin/proxy.cgi?url=</em></li>'+
                                    '</ul>',
                                name: 'proxyUrl'
                            }, {
                                fieldLabel: 'Generated file location',
                                qtipHtml: 'Absolute file path, on the server\'s, to the folder where the client has to be generated. The application will try to create the folder if it doesn\'t exists.<br/>' +
                                    '<strong>Note:</strong> Tomcat <em>webapps</em> folder may be specified here if you need a shorter URL and there is no apache available on the server. Also note that this solution may be dangerous since the AtlasMapper will copy its files even if the folder already exists and is used for an other Web app.<br/>' +
                                    '<strong>Warning:</strong> Only set this field if you are setting a client outside the application. If you set this field, you will also have to set the <i>Client base URL</i> with the URL that allow users to access the folder.'+
                                    notAvailableInDemoMode,
                                name: 'generatedFileLocation',
                                id: generatedFileLocationId,
                                disabled: demoMode,
                                validator: validateDependencies,
                                dependencies: [baseUrlId]
                            }, {
                                fieldLabel: 'Client base URL',
                                qtipHtml: 'URL to the client. This field is only needed to create the link to the client, in the Administration Interface. Failing to provide this information will not have any effect in the client itself. Default URL for this field is <i>/atlasmapper/client/&lt;Client name&gt;/</i><br/>'+
                                    '<strong>Warning:</strong> Only set this field if you are setting a client outside the application.'+
                                    notAvailableInDemoMode,
                                name: 'baseUrl',
                                id: baseUrlId,
                                disabled: demoMode,
                                validator: validateDependencies,
                                dependencies: [generatedFileLocationId]
                            }, {
                                boxLabel: 'Use layer service.',
                                qtipHtml: 'Uncheck this box to save the configuration of all layers in the configuration file. This allow the client to run without any AtlasMapper server support. It\'s useful for server that do not have tomcat installed.<br/>'+
                                    '<b>Note:</b> Disabling the <i>layer service</i> also disable the <i>WMS Feature Requests</i> on the client, for layers that are from a different domain name to the client.',
                                margin: '0 0 15 0',
                                xtype: 'checkboxfield',
                                name: 'useLayerService'
                            }, {
                                fieldLabel: 'Layer info service URL',
                                qtipHtml: 'URL used by the client to get information about layers. The default URL is: atlasmapper/public/layersInfo.jsp'+
                                    notAvailableInDemoMode,
                                name: 'layerInfoServiceUrl',
                                disabled: demoMode
                            }, {
                                fieldLabel: 'Download logger service URL (<a href="downloadLoggerDoc.html" target="_blank">doc</a>)',
                                qtipTitle: 'Download logger service URL',
                                qtipHtml: 'Download logger service, to log file download usage.'+
                                    notAvailableInDemoMode,
                                name: 'downloadLoggerServiceUrl',
                                disabled: demoMode
                            }, {
                                margin: '0 0 15 0',
                                boxLabel: 'Show <i>Add</i> <span style="color:green">[+]</span> and <i>Remove</i> <span style="color:red">[-]</span> layer buttons',
                                qtipHtml: 'Uncheck this box to remove the <i>Add</i> and <i>Remove</i> layer buttons.',
                                xtype: 'checkboxfield',
                                name: 'showAddRemoveLayerButtons'
                            }, {
                                margin: '0 0 15 0',
                                boxLabel: 'Show all <i>Base layers</i> together, in a tab, in <i>add layers</i> window.',
                                qtipHtml: 'Check this box to show all <em>Base layers</em> in the same tab, in the <em>add layers</em> window of this AtlasMapper client. Uncheck it to let the base layers appear in the tab of their appropriate data source.',
                                xtype: 'checkboxfield',
                                name: 'baseLayersInTab'
                            }, {
                                fieldLabel: 'Extra trusted hosts',
                                qtipHtml: 'List of hosts, separated by coma or new line. The application will be able to show KML from those hosts or do feature requests on WMS layers, even if they are not defined in the data sources.<br/>' +
                                    'Example: www.aodn.com, data.aims.gov.au',
                                name: 'extraAllowedHosts',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 100
                            }, {
                                margin: '0 0 15 0',
                                boxLabel: 'Minimal regeneration.',
                                qtipHtml: 'If this box is checked, the client regeneration will only overwrite the client configuration and the index.html file. ' +
                                    'Use this option if you want to manually alter the AtlasMapper client app.',
                                xtype: 'checkboxfield',
                                name: 'minimalRegeneration'
                            }, {
                                fieldLabel: 'Configuration Standard Version',
                                qtipHtml: 'Version of the configuration used by the client, for backward compatibilities.<br/>'+
                                    '<strong>Warning:</strong> Only set this field if this application has to generate a configuration for a old AtlasMapper client.',
                                name: 'version',
                                anchor: null,
                                hidden: true, // TODO Delete this once this field is implemented
                                width: 200
                            }
                        ]
                    }, {
                        // Config options to modify the appearance of the client
                        title: 'Map Appearance',
                        defaults: {
                            hideEmptyLabel: false
                        },
                        items: [
                            {
                                xtype: 'displayfield',
                                value: 'This tab allow you to customise the client map layout &amp; display.'
                            }, {
                                fieldLabel: 'Theme',
                                qtipHtml: 'ExtJS Theme',
                                name: 'theme',
                                xtype: 'combobox',
                                editable: false,
                                forceSelection: true, // Force the user to choose something from the list (do not allow random value)
                                valueField: 'name',
                                displayField: 'title',
                                allowBlank: false,
                                store: {
                                    fields: ['name', 'title'],
                                    data : [
                                        {"name": "", "title": "Blue (ExtJS default)"},
                                        // {"name": "xtheme-blue", "title": "Blue"}, // Same as default
                                        {"name": "xtheme-gray", "title": "Grey"},
                                        {"name": "xtheme-access", "title": "Accessibility"}
                                    ]
                                },
                                queryMode: 'local'
                            }, {
                                fieldLabel: 'Welcome Message',
                                name: 'welcomeMsg',
                                qtipHtml: 'A HTML welcome message shown in a ExtJS window when the client load. The message is also visible for client without JavaScript, therefore is indexable by search engines. Leave black to disable the welcome message\'s window.',
                                xtype: 'textareafield',
                                resizable: {transparent: true}, resizeHandles: 's',
                                height: 200
                            }, {
                                fieldLabel: 'Extra HEAD attributes',
                                qtipHtml: 'HTML snippet added to the html HEAD of the page, above the BODY. This is the place to add link to external CSS / JavaScript, or define inline CSS / JavaScript.<br/>' +
                                    'Example:<br/>' +
                                    '<pre>&lt;link rel="stylesheet" type="text/css"<br/>' +
                                    '  href="http://www.site.com/style.css" /&gt;<br/>' +
                                    '&lt;style type="text/css"&gt;<br/>' +
                                    '  h1 { border: none; }<br/>' +
                                    '&lt;/style&gt;</pre>',
                                qtipMaxWidth: 300,
                                name: 'headExtra',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Page header',
                                qtipHtml: 'HTML snippet displayed on top of the page, 100% browser width. The height is defined by the height of the HTML elements. This can be used to define the client branding and add links to the layer listing page, the company web site, etc.',
                                name: 'pageHeader',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Page footer',
                                qtipHtml: 'HTML snippet displayed on the bottom of the page, 100% browser width. The height is defined by the height of the HTML elements. This can be used to define the client branding and add links to the contact page, site map, etc.',
                                name: 'pageFooter',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Layer panel header',
                                qtipHtml: 'HTML snippet displayed on top of the layer panel, to the left of the map. The height is defined by the height of the HTML elements. This can be used to define the client branding and add some extra links.',
                                name: 'layersPanelHeader',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Layer panel footer',
                                qtipHtml: 'HTML snippet displayed on the bottom of the layer panel, to the left of the map. The height is defined by the height of the HTML elements. This can be used to define the client branding and add some extra links.',
                                name: 'layersPanelFooter',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Attributions',
                                name: 'attributions',
                                qtipHtml: 'String displayed at the bottom of the "Print Frame", before the layer attributions. This should be something like:<br/>©2012 My project'
                            }
                        ]
                    }, {
                        // Config options to choose which button appear in the map toolbar
                        title: 'Map toolbar',
                        items: [
                            {
                                xtype: 'fieldset',
                                title: 'Search',
                                defaults: {
                                    hideEmptyLabel: false
                                },
                                checkboxToggle: true,
                                checkboxName: 'searchEnabled',
                                qtipHtml: 'Uncheck this box disable search capability on the client.',
                                defaultType: 'textfield',
                                items: [
                                    {
                                        xtype: 'displayfield',
                                        value: 'This feature is under development and any configuration found here may eventually change in the future.'
                                    }, {
                                        boxLabel: 'Show Google search results.',
                                        qtipHtml: 'Check this box to add the results from Google to the search results.',
                                        xtype: 'checkboxfield',
                                        name: 'showGoogleResults'
                                    }, {
                                        boxLabel: 'Show OSM search results.',
                                        qtipHtml: 'Check this box to add the results from Open Street Map (OSM) to the search results.',
                                        xtype: 'checkboxfield',
                                        name: 'showOSMResults'
                                    }, {
                                        boxLabel: 'Show ArcGIS search results.',
                                        qtipHtml: 'Check this box to add the results from an ArcGIS server to the search results. Note that the server URL as to be defined in the ArcGIS search URL field.',
                                        xtype: 'checkboxfield',
                                        name: 'showArcGISResults'
                                    }, {
                                        fieldLabel: 'Google Search <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank">API Key</a>',
                                        qtipHtml: 'Set this to use Google Search. This API Key must be restricted by IP, not by referer.',
                                        name: 'googleSearchAPIKey'
                                    }, {
                                        fieldLabel: 'OSM Search <a href="https://developer.mapquest.com/plan_purchase/steps/business_edition/business_edition_free/register" target="_blank">API Key</a>',
                                        qtipHtml: 'Set this to use Open Street Map Search.',
                                        name: 'osmSearchAPIKey'
                                    }, {
                                        fieldLabel: 'ArcGIS search URL',
                                        qtipHtml: 'URL used by the server to perform searches against ArcGIS layers.<br/>' +
                                            'Example:<br/>' +
                                            'http://www.a.com/.../MapServer/find' +
                                            '<div style="margin-left:1em;">' +
                                            '?f=json<br/>' +
                                            '&contains=true<br/>' +
                                            '&returnGeometry=true<br/>' +
                                            '&layers=6%2C0<br/>' +
                                            '&searchFields=LOC_NAME_L%2CNAME<br/>' +
                                            '&searchText={QUERY}' +
                                            '</div>',
                                        name: 'arcGISSearchUrl'
                                    }, {
                                        fieldLabel: 'AtlasMapper Search service URL',
                                        qtipHtml: '<b>Expert only</b><br/>URL used by the client to perform searches. Only set this field if you want to use an other search server than the AtlasMapper. The default URL is: atlasmapper/public/search.jsp',
                                        name: 'searchServiceUrl'
                                    }
                                ]
                            }, {
                                xtype: 'fieldset',
                                title: 'Print',
                                defaults: {
                                    hideEmptyLabel: false
                                },
                                checkboxToggle: true,
                                checkboxName: 'printEnabled',
                                qtipHtml: 'Uncheck this box remove the print button from the toolbar.',
                                defaultType: 'textfield',
                                items: [
                                    {
                                        xtype: 'displayfield',
                                        value: 'This feature is under development and any configuration found here may eventually change in the future.'
                                    }
                                ]
                            }, {
                                xtype: 'fieldset',
                                title: 'Save map',
                                defaults: {
                                    hideEmptyLabel: false
                                },
                                checkboxToggle: true,
                                checkboxName: 'saveMapEnabled',
                                qtipHtml: 'Uncheck this box remove the save map button from the toolbar.',
                                defaultType: 'textfield',
                                items: [
                                    {
                                        xtype: 'displayfield',
                                        value: 'This feature is under development and any configuration found here may eventually change in the future.'
                                    }
                                ]
                            }, {
                                xtype: 'fieldset',
                                title: 'Map options',
                                defaults: {
                                    hideEmptyLabel: false
                                },
                                checkboxToggle: true,
                                checkboxName: 'mapConfigEnabled',
                                qtipHtml: 'Uncheck this box remove the map options button from the toolbar.',
                                defaultType: 'textfield',
                                items: [
                                    {
                                        xtype: 'displayfield',
                                        value: 'This feature is under development and any configuration found here may eventually change in the future.'
                                    }
                                ]
                            }, {
                                xtype: 'fieldset',
                                title: 'Ruler',
                                defaults: {
                                    hideEmptyLabel: false
                                },
                                checkboxToggle: true,
                                checkboxName: 'mapMeasurementEnabled',
                                qtipHtml: 'Check this box add the ruler tool in the toolbar.',
                                defaultType: 'textfield',
                                items: [
                                    {
                                        xtype: 'displayfield',
                                        value: 'This feature is under development and any configuration found here may eventually change in the future.'
                                    }, {
                                        boxLabel: 'Distance measurement',
                                        qtipHtml: 'Check this box to add a ruler tool to measure distance.',
                                        xtype: 'checkboxfield',
                                        name: 'mapMeasurementLineEnabled'
                                    }, {
                                        boxLabel: 'Area measurement',
                                        qtipHtml: 'Check this box to add a ruler tool to measure area.',
                                        xtype: 'checkboxfield',
                                        name: 'mapMeasurementAreaEnabled'
                                    }
                                ]
                            }
                        ]
                    }, {
                        // Config options to modify the appearance of the list of layer
                        title: 'List Appearance',
                        defaults: {
                            hideEmptyLabel: false
                        },
                        items: [
                            {
                                xtype: 'displayfield',
                                value: 'This tab allow you to customise the layer listing page.'
                            }, {
                                fieldLabel: 'Page header',
                                qtipHtml: 'HTML snippet displayed on top of the layer listing page, 100% browser width. The height is defined by the height of the HTML elements. This can be used to define the client branding and add links to the mapping page, the company web site, etc.',
                                name: 'listPageHeader',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Page footer',
                                qtipHtml: 'HTML snippet displayed on the bottom of the layer listing page, 100% browser width. The height is defined by the height of the HTML elements. This can be used to define the client branding and add links to the contact page, site map, etc.',
                                name: 'listPageFooter',
                                xtype: 'textareafield'
                            }, {
                                fieldLabel: 'Base layer - Service URL',
                                qtipHtml: 'Example: https://maps.eatlas.org.au/maps/wms',
                                name: 'listBaseLayerServiceUrl'
                            }, {
                                fieldLabel: 'Base layer - Layer ID',
                                qtipHtml: 'Example: ea:World_NED_NE2',
                                name: 'listBaseLayerId'
                            }, {
                                fieldLabel: 'Layer preview - Width',
                                qtipHtml: 'Default: 200',
                                name: 'listLayerImageWidth',
                                xtype: 'numberfield',
                                allowDecimals: false,
                                // Remove spinner buttons, and arrow key and mouse wheel listeners
                                hideTrigger: true,
                                keyNavEnabled: false
                            }, {
                                fieldLabel: 'Layer preview - Height',
                                qtipHtml: 'Default: 180',
                                name: 'listLayerImageHeight',
                                xtype: 'numberfield',
                                allowDecimals: false,
                                // Remove spinner buttons, and arrow key and mouse wheel listeners
                                hideTrigger: true,
                                keyNavEnabled: false
                            }
                        ]
                    }
                ]
            }]
        });
        this.callParent();
    },

    setActiveRecord: function(record){
        if (record) {
            this.activeRecord = record;
            this.getForm().loadRecord(record);

            var checkedDataSources = record.get('dataSources') ? record.get('dataSources') : [];

            // Load the data sources to the grid
            var dataSourcesItems = [];
            // NOTE: data sources variable is set in clientsConfigPage.jsp
            // I don't want to do an Ajax query to get those...
            Ext.iterate(dataSources, function(dataSourceId, dataSourceObj) {
                var htmlStatus = '<span class="grid-false"><span class="text">Invalid</span></span>';
                if (dataSourceObj.status !== null) {
                    if (dataSourceObj.status === 'OKAY') {
                        htmlStatus = '<span class="grid-true"><span class="text">Valid</span></span>';
                    } else if (dataSourceObj.status === 'PASSED') {
                        htmlStatus = '<span class="grid-warning"><span class="text">Usable</span></span>';
                    }
                }
                dataSourcesItems.push({
                    id: dataSourceId,
                    type: dataSourceObj.type,
                    title: dataSourceObj.name,
                    status: htmlStatus,
                    checked: (checkedDataSources.indexOf(dataSourceId) !== -1)
                });
            });

            this.dataSourcesStore.loadData(dataSourcesItems);
        } else if (this.defaultValues) {
            this.activeRecord = this.defaultValues;
            this.getForm().loadRecord(this.defaultValues);
        } else {
            this.activeRecord = null;
            this.getForm().reset();
        }
    },

    onSave: function(){
        frameset.setSavingMessage('Saving...');
        var active = this.activeRecord,
            form = this.getForm();

        if (!active) {
            frameset.setError('The record can not be found.');
            return false;
        }
        if (form.isValid()) {
            // Resync the model instance
            // NOTE: The "active" instance become out of sync everytime the grid get refresh; by creating an instance or updating an other one, for example. The instance can not be saved when it's out of sync.
            active = active.store.getById(active.internalId);

            // Save the selected data sources from the grid to the form
            var dataSourcesValue = [];
            this.dataSourcesStore.data.each(function(item) {
                if (item.data.checked) {
                    dataSourcesValue.push(item.data.id);
                }
            }, this);
            active.set('dataSources', dataSourcesValue);

            form.updateRecord(active);
            frameset.setSavedMessage('Client saved', 500);
            return true;
        }
        frameset.setError('Some fields contains errors.');
        return false;
    },

    onCreate: function(){
        frameset.setSavingMessage('Creating...');
        var form = this.getForm();

        if (form.isValid()) {
            var values = form.getValues();

            // Save the selected data sources from the grid to the form
            var dataSourcesValue = [];
            this.dataSourcesStore.data.each(function(item) {
                if (item.data.checked) {
                    dataSourcesValue.push(item.data.id);
                }
            }, this);
            // Add dataSources to the values.
            // NOTE: form.setValues can not be used here because there is currently no field for dataSources
            //     and the field can not be created with setValues. The simpler the better.
            values['dataSources'] = dataSourcesValue;

            this.fireEvent('create', this, values);
            frameset.setSavedMessage('Client created', 500);
            return true;
        }
        frameset.setError('Some fields contains errors.');
        return false;
    },

    reset: function(){
        this.getForm().reset();
        this.setActiveRecord(this.defaultValues);
    },

    onReset: function(){
        this.reset();
    }
});

// Definition of the Grid (the table that show the list of clients)
Ext.define('Writer.ClientConfigGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.writerclientconfiggrid',

    requires: [
        'Ext.form.field.Text',
        'Ext.toolbar.TextItem'
    ],

    renderLayerCount: function(layerCount) {
        return layerCount <= 0 ? '<span class="grid-error">0</span>' : '<span class="grid-success">' + layerCount + '</span>';
    },

    initComponent: function(){
        Ext.apply(this, {
            iconCls: 'icon-grid',
            dockedItems: [
                {
                    xtype: 'toolbar',
                    items: [
                        {
                            iconCls: 'icon-add',
                            text: 'Add',
                            scope: this,
                            handler: this.onAddClick
                        }, {
                            iconCls: 'icon-delete',
                            text: 'Delete',
                            disabled: true,
                            itemId: 'delete',
                            scope: this,
                            handler: this.onDeleteClick
                        }
                    ]
                }
            ],
            columns: [
                {
                    header: 'Main',
                    width: 35,
                    xtype: 'radiocolumn',
                    dataIndex: 'default'
                }, {
                    header: 'Enable',
                    width: 50,
                    align: 'center',
                    sortable: true,
                    xtype: 'booleancolumn',
                    // The icon is placed using CSS and the text is hidden with CSS.
                    trueText: '<span class="grid-true"><span class="text">True</span></span>',
                    falseText: '<span class="grid-false"><span class="text">False</span></span>',
                    dataIndex: 'enable'
                }, {
                    header: 'Client ID',
                    width: 100,
                    sortable: true,
                    dataIndex: 'clientId'
                }, {
                    header: 'Client Name',
                    width: 100,
                    sortable: true,
                    dataIndex: 'clientName'
                }, {
                    header: 'Generated client',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'clientUrl',
                    renderer: function(val) {
                        return val ? '<a href="'+val+'" target="_blank">'+val+'</a>' : '';
                    }
                }, {
                    header: 'Layer listing',
                    width: 130,
                    sortable: true,
                    dataIndex: 'layerListUrl',
                    renderer: function(val) {
                        return val ? '<a href="'+val+'" target="_blank">Preview layers</a>' : '';
                    }
                }, {
                    header: 'Layers',
                    width: 70,
                    sortable: true,
                    dataIndex: 'layerCount',
                    renderer: this.renderLayerCount
                }, {
                    header: 'Last generated',
                    width: 130,
                    sortable: true,
                    dataIndex: 'lastGenerated'
                }, {
                    header: 'Modified',
                    width: 55,
                    align: 'center',
                    sortable: true,
                    xtype: 'booleancolumn',
                    // The icon is placed using CSS and the text is hidden with CSS.
                    trueText: '<span class="modified-true"><span class="text">True</span></span>',
                    falseText: '<span class="modified-false"><span class="text">False</span></span>',
                    dataIndex: 'modified'
                }, {
                    // http://docs.sencha.com/ext-js/4-0/#/api/Ext.grid.column.Action
                    header: 'Actions',
                    xtype: 'actioncolumn',
                    width: 85, // padding of 8px between icons
                    defaults: {
                        iconCls: 'grid-icon'
                    },
                    items: [
                        {
                            icon: '../resources/icons/edit.png',

                            // Bug: defaults is ignored (http://www.sencha.com/forum/showthread.php?138446-actioncolumn-ignore-defaults)
                            iconCls: 'grid-icon',

                            tooltip: 'Edit',
                            scope: this,
                            handler: function(grid, rowIndex, colIndex) {
                                // Show the "Edit" window.
                                var rec = grid.getStore().getAt(rowIndex);
                                if (rec) {
                                    var clientConfigFormWindow = this.getClientConfigFormWindow('save', rec);
                                    clientConfigFormWindow.show();
                                    clientConfigFormWindow.child('.form').setActiveRecord(rec);
                                } else {
                                    frameset.setError('No record has been selected.');
                                }
                            }
                        }, {
                            icon: '../resources/icons/cog_go.png',

                            // Bug: defaults is ignored (http://www.sencha.com/forum/showthread.php?138446-actioncolumn-ignore-defaults)
                            iconCls: 'grid-icon',

                            scope: this,
                            tooltip: 'Generate<br/>Push the modifications to the live client',
                            handler: function(grid, rowIndex, colIndex) {
                                var rec = grid.getStore().getAt(rowIndex);
                                if (rec) {
                                    this.handleRegenerate(rec);
                                } else {
                                    frameset.setError('No record has been selected.');
                                }
                            }
                        }, {
                            icon: '../resources/icons/application_xp_terminal.png',
                            // Bug: defaults is ignored (http://www.sencha.com/forum/showthread.php?138446-actioncolumn-ignore-defaults)
                            iconCls: 'grid-icon',
                            tooltip: 'View logs',
                            scope: this,
                            handler: function(that) {
                                return function(grid, rowIndex, colIndex) {
                                    var rec = grid.getStore().getAt(rowIndex);
                                    if (rec) {
                                        that.handleShowLogs(rec);
                                    } else {
                                        frameset.setError('No record has been selected.');
                                    }
                                };
                            } (this)
                        }
                    ]
                }
            ]
        });
        this.callParent();
        this.getSelectionModel().on('selectionchange', this.onSelectChange, this);
    },

    handleRegenerate: function(rec) {
        if (rec) {
            var clientId = rec.get('clientId');
            var clientName = rec.get('clientName') + ' (' + clientId + ')';

            // If running, show the logs instead
            frameset.isThreadRunning(
                'clientsConfig.jsp',
                {
                    'action': 'GETLOGS',
                    'clientId': clientId
                },

                function(that, rec) {
                    return function(isRunning) {
                        if (isRunning) {
                            that.showClientRegenerateLogWindow(frameset, clientId, clientName);
                        } else {
                            that.confirmRegenerate(rec);
                        }
                    };
                }(this, rec)
            );
        }
    },

    handleShowLogs: function(rec) {
        if (rec) {
            var clientId = rec.get('clientId');
            var clientName = rec.get('clientName') + ' (' + clientId + ')';

            this.showClientRegenerateLogWindow(frameset, clientId, clientName);
        }
    },

    getClientConfigFormWindow: function(action, rec) {
        var actionButton = null;
        var that = this;
        if (action === 'add') {
            actionButton = Ext.create('Ext.button.Button', {
                iconCls: 'icon-add',
                text: 'Create',
                handler: function() {
                    var window = this.ownerCt.ownerCt;
                    var form = window.child('.form');
                    if (form.onCreate()) {
                        window.close();
                    }
                }
            });
        } else {
            actionButton = Ext.create('Ext.button.Button', {
                iconCls: 'icon-save',
                text: 'Apply',
                handler: function() {
                    var window = this.ownerCt.ownerCt;
                    var form = window.child('.form');
                    if (form.onSave()) {
                        window.close();
                        // The store auto-reload is only triggered when the server returns a success=true.
                        // Sometime, the failure is not due to not been able to save the data, but because of an IO.
                        // In those case (example; moving the client to a folder with no write access),
                        // we want the store to be reloaded so we can display the updated values.
                        that.store.load();
                    }
                }
            });
        }

        var title = 'Client configuration';
        if (rec) {
            title += ' for <i>' + rec.get('clientName') + ' ('+ rec.get('clientId') +')</i>';
        }
        return Ext.create('Ext.window.Window', {
            title: title,
            width: 700,
            height: 500,
            maxHeight: Ext.getBody().getViewSize().height,
            layout: 'fit',
            constrainHeader: true,
            closeAction: 'destroy',

            items: [{
                xtype: 'writerclientconfigform',
                listeners: {
                    scope: this,
                    create: function(form, data){
                        // Insert the data into the model.
                        // If something goes wrong, the store will
                        // manage the exception.
                        this.store.insert(0, data);
                    }
                }
            }],
            buttons: [
                actionButton,
                {
                    text: 'Cancel',
                    handler: function() {
                        var window = this.ownerCt.ownerCt;
                        window.close();
                    }
                }
            ]
        });
    },

    onSelectChange: function(selModel, selections) {
        this.down('#delete').setDisabled(selections.length === 0);
    },



    /**
     * id: Numerical is of the client (used in the Grid)
     * clientName: Display name of the client, for user friendly messages
     */
    confirmRegenerate: function(rec) {
        var id = -1;
        var isGenerated = false;
        var clientId = "UNKNOWN";
        var clientName = "UNKNOWN";
        var minimalRegeneration = false;
        if (rec) {
            id = rec.get('id');
            isGenerated = !!rec.get('clientUrl');
            clientId = rec.get('clientId');
            clientName = rec.get('clientName') + ' (' + clientId + ')';
            minimalRegeneration = rec.get('minimalRegeneration');
        }

        var that = this;
        Ext.create('Ext.window.Window', {
            layout:'fit',
            width: 400,
            title: 'Regenerate the client <i>'+clientName+'</i>',
            closable: true,
            resizable: false,
            plain: true,
            border: false,
            items: {
                bodyPadding: 5,
                html: minimalRegeneration ? "This will overwrite the configuration files and index.html file only." : "This will overwrite all the client's files and configuration."
            },
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'bottom',
                ui: 'footer',
                defaults: { minWidth: 75 },
                items: [
                    '->', // Pseudo item to move the following items to the right (available with ui:footer)
                    {
                        xtype: 'button',
                        text: 'Generate',
                        padding: '2 10',
                        handler: function() {
                            that.onRegenerate(id, clientId, clientName);
                            this.ownerCt.ownerCt.close();
                        }
                    }, {
                        xtype: 'button',
                        text: 'Cancel',
                        padding: '2 10',
                        handler: function() {
                            this.ownerCt.ownerCt.close();
                        }
                    }
                ]
            }]
        }).show();
    },

    /**
     * id: Numerical is of the client (used in the Grid)
     * clientId: Client string ID
     * clientName: Display name of the client, for user friendly messages
     */
    onRegenerate: function(id, clientId, clientName) {
        var that = this;
        frameset.setSavingMessage('Regenerating <i>'+clientName+'</i> configuration files and index pages...');

        // Request the data and update the window when we receive it
        Ext.Ajax.request({
            url: 'clientsConfig.jsp',
            timeout: timeoutPerClient,
            params: {
                'action': 'GENERATE',
                'id': id,
                'jsonResponse': true
            },
            success: function(that, clientId, clientName) {
                return function(response) {
                    var responseObj = null;
                    var statusCode = response ? response.status : null;
                    if (response && response.responseText) {
                        try {
                            responseObj = Ext.decode(response.responseText);
                            clientName = responseObj.clientName + ' (' + responseObj.clientId + ')';
                        } catch (err) {
                            responseObj = {errors: [err.toString()]};
                        }
                    }
                    if(responseObj && responseObj.success){
                        if (responseObj.errors || responseObj.warnings) {
                            frameset.setErrorsAndWarnings('Generation of <i>'+clientName+'</i> passed', 'Warning(s) occurred while generating the client configuration.', responseObj, statusCode);
                        } else if (responseObj.messages) {
                            frameset.setErrorsAndWarnings('Generation of <i>'+clientName+'</i> succeed', null, responseObj, statusCode);
                        } else {
                            frameset.setSavedMessage('Generation of <i>'+clientName+'</i> succeed');
                            that.showClientRegenerateLogWindow(frameset, clientId, clientName);
                        }
                    } else {
                        frameset.setErrorsAndWarnings('Generation of <i>'+clientName+'</i> failed', 'Error(s) / warning(s) occurred while generating the client configuration.', responseObj, statusCode);
                    }
                    that.onReload();
                };
            }(that, clientId, clientName),

            failure: function(that, clientName) {
                return function(response) {
                    if (response.timedout) {
                        frameset.setError('Request timed out.', 408);
                    } else {
                        var statusCode = response ? response.status : null;
                        var responseObj = null;
                        if (response && response.responseText) {
                            try {
                                responseObj = Ext.decode(response.responseText);
                                clientName = responseObj.clientName + ' (' + responseObj.clientId + ')';
                            } catch (err) {
                                responseObj = {errors: [err.toString()]};
                            }
                        }
                        frameset.setErrors('An error occurred while generating the client '+clientName+'.', responseObj, statusCode);
                    }
                    that.onReload();
                };
            }(that, clientName)
        });
    },

    /**
     * Open the log window and periodically request logs to the server until the process is done.
     * @param frameset The frameset object used to handle the logs window
     * @param clientId The Client string ID chosen by the user
     *     (this is more robust than the numerical ID since the grid may change during the generation process)
     * @param clientName The name of the Client, to be shown in the window title.
     */
    showClientRegenerateLogWindow: function(frameset, clientId, clientName) {
        frameset.setLogsRequest(
            'Rebuilding client <i>'+clientName+'</i>',
            'Rebuilding client',
            'clientsConfig.jsp',
            {
                'action': 'GETLOGS',
                'clientId': clientId
            },
            'clientsConfig.jsp',
            {
                'action': 'STOP_GENERATE',
                'clientId': clientId
            },
            function(that) {
                return function(responseObj) {
                    that.onReload();
                };
            }(this)
        );
    },

    onReload: function() {
        this.store.load();
    },

    onAddClick: function() {
        var clientConfigFormWindow = this.getClientConfigFormWindow('add');
        clientConfigFormWindow.child('.form').reset();
        clientConfigFormWindow.show();
    },

    onDeleteClick: function() {
        var selection = this.getView().getSelectionModel().getSelection()[0];
        if (selection) {
            var clientName = 'UNKNOWN';
            if (selection.data) {
                if (selection.data.clientName) {
                    clientName = selection.data.clientName;
                } else {
                    clientName = selection.data.clientId;
                }
            }
            var confirm = Ext.MessageBox.confirm(
                'Confirm',
                'Deleting the client will also delete the generated files.<br/>'+
                'This operation can not be undone.<br/>'+
                '<br/>'+
                'Are you sure you want to delete the client <b>'+clientName+'</b>?',
                function(btn) {
                    if (btn == 'yes') {
                        this.onDeleteConfirmed();
                    }
                },
                this
            );
            // Set "No" as default
            confirm.defaultButton = 2;
        } else {
            frameset.setError('Can not find the client to delete');
        }
    },

    onDeleteConfirmed: function() {
        frameset.setSavingMessage('Deleting a client...');
        var selection = this.getView().getSelectionModel().getSelection()[0];
        if (selection) {
            var clientName = 'UNKNOWN';
            if (selection.data) {
                if (selection.data.clientName) {
                    clientName = selection.data.clientName;
                } else {
                    clientName = selection.data.clientId;
                }
            }
            this.store.remove(selection);
            frameset.setSavedMessage('Client <b>'+clientName+'</b> deleted');
        } else {
            frameset.setError('Can not find the client to delete');
        }
    }
});

Ext.define('Writer.ClientConfig', {
    extend: 'Ext.data.Model',
    // Grids must have an unmutable ID

    // Default values:
    // Set default values in the defaultValues instance (lines 70~90).
    // Only set default value "false" for checkboxes:
    // The form do not return the value when they are unchecked,
    // forcing the model to set them to their 'model default value'.
    fields: [
        {name: 'id', type: 'int', useNull: true},
        {name: 'default', type: 'boolean', defaultValue: false},
        // asUCString: As UpperCase String -> Ignore case sorting
        {name: 'clientId', sortType: 'asUCString'},
        {name: 'clientName', sortType: 'asUCString'},
        {name: 'layerCount', type: 'int'},
        {name: 'modified', type: 'boolean', defaultValue: false},

        'attributions',
        'welcomeMsg',
        'headExtra',

        'dataSources', // String or Array<String>
        {name: 'mainClientEnable', type: 'boolean', defaultValue: false},
        'mainClientModules', // String or Array<String>
        {name: 'embeddedClientEnable', type: 'boolean', defaultValue: false},
        'embeddedClientModules', // String or Array<String>

        'manualOverride',
        'lastGenerated',
        'blackAndWhiteListedLayers',
        'legendParameters',
        'clientUrl',
        'layerListUrl',
        'generatedFileLocation',
        'baseUrl',
        'proxyUrl',
        'layerInfoServiceUrl',
        {name: 'projection', type: 'string'},
        {name: 'longitude', type: 'float'},
        {name: 'latitude', type: 'float'},
        {name: 'zoom', type: 'int'},
        {name: 'showAddRemoveLayerButtons', type: 'boolean', defaultValue: false},
        {name: 'baseLayersInTab', type: 'boolean', defaultValue: false},
        'defaultLayers',
        'version',
        {name: 'useLayerService', type: 'boolean', defaultValue: false},
        {name: 'enable', type: 'boolean', defaultValue: false},

        {name: 'searchEnabled', type: 'boolean', defaultValue: false},
        {name: 'showGoogleResults', type: 'boolean', defaultValue: false},
        {name: 'showArcGISResults', type: 'boolean', defaultValue: false},
        'googleSearchAPIKey',
        'osmSearchAPIKey',
        'arcGISSearchUrl',
        {name: 'showOSMResults', type: 'boolean', defaultValue: false},
        'searchServiceUrl',

        {name: 'printEnabled', type: 'boolean', defaultValue: false},
        {name: 'saveMapEnabled', type: 'boolean', defaultValue: false},
        {name: 'mapConfigEnabled', type: 'boolean', defaultValue: false},
        {name: 'mapMeasurementEnabled', type: 'boolean', defaultValue: false},
        {name: 'mapMeasurementLineEnabled', type: 'boolean', defaultValue: false},
        {name: 'mapMeasurementAreaEnabled', type: 'boolean', defaultValue: false},

        'theme',
        'pageHeader',
        'pageFooter',
        'layersPanelHeader',
        'layersPanelFooter',

        'listPageHeader',
        'listPageFooter',
        'listBaseLayerServiceUrl',
        'listBaseLayerId',
        'listLayerImageWidth',
        'listLayerImageHeight',

        'extraAllowedHosts',
        {name: 'minimalRegeneration', type: 'boolean', defaultValue: false},

        'downloadLoggerServiceUrl',

        'comment'
    ]/*,
    validations: [{
        field: 'clientId',
        type: 'length',
        min: 1
    }]*/
});

Ext.require([
    'Ext.data.*',
    'Ext.window.MessageBox'
]);


Ext.onReady(function(){
    frameset = new Frameset();
    frameset.setContentTitle('Atlas Mapper clients configuration');
    frameset.addContentDescription('<p><img src="../resources/images/maps-small.jpg" style="float:right; width: 200px; height: 122px"> The <i>AtlasMapper server</i> allows you to set up multiple <i>clients</i>. For most installations only a single client is necessary. In this version each clients can be setup with their own source of layers and initial state (<i>starting position</i>, <i>zoom</i> and <i>layers</i>). In the future each client will be able to be branded differently and have different client <i>modules</i> enabled or disabled.</p><p>Each client is generated into their own folder (based on the <i>client name</i>) in <i>AtlasMapper</i> configuration directory. These clients can be made, if necessary, to run standalone without the <i>AtlasMapper server</i> using a only a web server such as <i>apache</i> or <i>IIS</i>. For this see the <i>Client configuration/Advanced options/Use layer service</i> option.</p>');
    frameset.render(document.body);

    var store = Ext.create('Ext.data.Store', {
        model: 'Writer.ClientConfig',
        autoLoad: true,
        autoSync: true,
        sorters: {
            property: 'clientName',
            direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
        },
        proxy: {
            type: 'ajax',
            api: {
                read: 'clientsConfig.jsp?action=read',
                create: 'clientsConfig.jsp?action=create',
                update: 'clientsConfig.jsp?action=update',
                destroy: 'clientsConfig.jsp?action=destroy'
            },
            reader: {
                type: 'json',
                successProperty: 'success',
                root: 'data',
                messageProperty: 'message'
            },
            writer: {
                type: 'json',
                writeAllFields: false,
                root: 'data'
            },
            listeners: {
                exception: function(proxy, response, operation){
                    var responseObj = null;
                    var statusCode = response ? response.status : null;
                    if (response && response.responseText) {
                        try {
                            responseObj = Ext.decode(response.responseText);
                        } catch (err) {
                            responseObj = {errors: [err.toString()]};
                        }
                    }
                    var operStr = 'UNKNOWN';
                    if (operation && operation.action) { operStr = operation.action; }
                    frameset.setErrors('An error occurred while executing the operation ['+operStr+'] on clients.', responseObj, statusCode);
                }
            }
        }
    });

    var clientsConfigGrid = Ext.create('Writer.ClientConfigGrid', {
        itemId: 'grid',
        height: 400,
        resizable: true, resizeHandles: 's',
        store: store
    });

    frameset.addContent(clientsConfigGrid);
});
