sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/m/MessageBox"], (
  Controller,
  JSONModel,
  MessageBox
) => {
  "use strict";

  return Controller.extend("com.aegea.requestregistrationchange.controller.Form", {
    onInit() {
      const oAddressModel = new JSONModel(this._getInitialAddressData());
      this.getView().setModel(oAddressModel, "address");

      const oUserModel = new JSONModel({ displayName: "" });
      this.getView().setModel(oUserModel, "user");

      const userUrl = this.getOwnerComponent()
        .getManifestObject()
        .resolveUri("user-api/currentUser");

      fetch(userUrl)
        .then((oResponse) => (oResponse.ok ? oResponse.json() : null))
        .then((oData) => {
          const sDisplayName = oData && (oData.givenName || oData.name || oData.email);
          if (sDisplayName) {
            oUserModel.setProperty("/displayName", `${oData.firstname} ${oData.lastname}`);
          }
        })
        .catch((oError) => {
          // eslint-disable-next-line no-console
          console.error(oError);
        });

      const sServiceUrl = this.getOwnerComponent()
        .getManifestObject()
        .resolveUri("document-information-extraction/v1/schemas?clientId=default");

      fetch(sServiceUrl)
        .then((oResponse) => oResponse.json())
        .then((oData) => {
          // eslint-disable-next-line no-console
          console.log(oData);
        });
    },

    wizardCompletedHandler() {
      const oComponent = this.getOwnerComponent();
      const oRouter = oComponent.getRouter();
      oRouter.navTo("RouteReview");
    },

    onAddressDocumentTypeMismatch() {
      MessageBox.error("Formato de arquivo não suportado. Envie um arquivo PDF, JPG ou PNG.");
    },

    async onAddressDocumentChange(oEvent) {
      const oAddressModel = this.getView().getModel("address");
      const [oFile] = oEvent.getParameter("files") || [];

      if (!oFile) {
        oAddressModel.setData(this._getInitialAddressData());
        return;
      }

      oAddressModel.setProperty("/documentUploaded", true);
      this.getView().setBusy(true);

      try {
        const oFormData = new FormData();
        oFormData.append("file", oFile, oFile.name);
        oFormData.append(
          "options",
          JSON.stringify({
            clientId: "default",
            schemaId: "9881cf96-8233-42ab-95d7-4853d232a555",
          })
        );

        const sServiceUrl = this.getOwnerComponent()
          .getManifestObject()
          .resolveUri("document-information-extraction/v1/document/jobs");

        const oResponse = await fetch(sServiceUrl, {
          method: "POST",
          body: oFormData,
        });

        if (!oResponse.ok) {
          throw new Error(`Falha ao enviar o documento (HTTP ${oResponse.status})`);
        }

        const oJob = await oResponse.json();
        // eslint-disable-next-line no-console
        console.log(oJob);

        if (!oJob.id) {
          throw new Error("Resposta inválida do serviço de extração de documentos.");
        }

        const oResult = await this._pollDocumentJob(oJob.id);
        // eslint-disable-next-line no-console
        console.log(oResult);

        if (oResult.status !== "DONE") {
          throw new Error("O processamento do documento não foi concluído a tempo.");
        }

        this._updateAddressFromExtraction(oResult.extraction && oResult.extraction.headerFields);
        oAddressModel.setProperty("/showFields", true);
      } catch (oError) {
        // eslint-disable-next-line no-console
        console.error(oError);
        MessageBox.error(
          "Não foi possível processar o documento enviado. Tente anexar o arquivo novamente."
        );
      } finally {
        this.getView().setBusy(false);
      }
    },

    _getInitialAddressData() {
      return {
        postalCode: "",
        neighborhood: "",
        city: "",
        state: "",
        street: "",
        streetNumber: "",
        complement: "",
        documentUploaded: false,
        showFields: false,
      };
    },

    _updateAddressFromExtraction(aHeaderFields = []) {
      const oAddressModel = this.getView().getModel("address");
      const oFormatters = {
        postalCode: this._formatPostalCode,
        streetNumber: this._stripLeadingZeros,
      };

      aHeaderFields
        .filter((oField) => oField.name in oAddressModel.getData())
        .forEach((oField) => {
          const fnFormat = oFormatters[oField.name];
          const vValue = fnFormat ? fnFormat(oField.value) : oField.value;
          oAddressModel.setProperty(`/${oField.name}`, vValue);
        });
    },

    onPostalCodeChange(oEvent) {
      oEvent.getSource().setValue(this._formatPostalCode(oEvent.getParameter("value")));
    },

    onStreetNumberChange(oEvent) {
      oEvent.getSource().setValue(this._stripLeadingZeros(oEvent.getParameter("value")));
    },

    _formatPostalCode(sValue) {
      const sDigits = String(sValue || "")
        .replace(/\D/g, "")
        .slice(0, 8);

      return sDigits.length > 5 ? `${sDigits.slice(0, 5)}-${sDigits.slice(5)}` : sDigits;
    },

    formatAddressStepValidated(
      bDocumentUploaded,
      sPostalCode,
      sStreet,
      sStreetNumber,
      sNeighborhood,
      sCity,
      sState
    ) {
      return (
        !!bDocumentUploaded &&
        [sPostalCode, sStreet, sStreetNumber, sNeighborhood, sCity, sState].every(
          (sValue) => !!sValue && sValue.trim() !== ""
        )
      );
    },

    _stripLeadingZeros(sValue) {
      const sTrimmed = String(sValue || "").trim();
      const sCollapsed = sTrimmed.replace(/\s+/g, "");
      const bIsNumeric = /^\d+$/.test(sCollapsed);
      const sSource = bIsNumeric ? sCollapsed.slice(0, 6) : sTrimmed;

      return sSource.replace(/^0+(?=\d)/, "");
    },

    async _pollDocumentJob(sJobId, iAttempt = 1) {
      const iMaxAttempts = 10;
      const iRetryDelay = 5000;

      const sJobUrl = this.getOwnerComponent()
        .getManifestObject()
        .resolveUri(`document-information-extraction/v1/document/jobs/${sJobId}`);

      const oResponse = await fetch(sJobUrl);
      const oData = await oResponse.json();

      if (oData.status === "PENDING" && iAttempt < iMaxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, iRetryDelay));
        return this._pollDocumentJob(sJobId, iAttempt + 1);
      }

      return oData;
    },
  });
});
