sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageBox"], (Controller, MessageBox) => {
  "use strict";

  return Controller.extend("com.aegea.requestregistrationchange.controller.Review", {
    onSubmitRequest() {
      MessageBox.success("Dados enviados com sucesso");
    },

    onCancelReview() {
      this.getOwnerComponent().getRouter().navTo("RouteForm");
    },
  });
});
