sap.ui.define(["sap/ui/core/mvc/Controller"], (Controller) => {
  "use strict";

  return Controller.extend("com.aegea.requestregistrationchange.controller.Form", {
    onInit() {},

    wizardCompletedHandler() {
      const oComponent = this.getOwnerComponent();
      const oRouter = oComponent.getRouter();
      oRouter.navTo("RouteReview");
    },
  });
});
