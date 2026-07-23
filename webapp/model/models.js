sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Initial data for the "address" model, shared across the Form and Review pages.
         * @returns {object} The initial address data.
         */
        createAddressData: function () {
            return {
                postalCode: "",
                neighborhood: "",
                city: "",
                state: "",
                street: "",
                streetNumber: "",
                complement: "",
                documentUploaded: false,
                showFields: false
            };
        }
    };

});