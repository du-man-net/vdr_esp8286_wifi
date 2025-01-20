//% weight=10 color=#ff8000 icon="\uf1eb" block="vdr ESP8266 WiFi"
namespace vdr_ESP8286_wifi {
    // Flag to indicate whether the ESP8266 was initialized successfully.
    let VDResp8266Initialized = false

    // Buffer for data received from UART.
    let VDRrxData = ""



    /**
     * Send AT command and wait for response.
     * Return true if expected response is received.
     * @param command The AT command without the CRLF.
     * @param expected_response Wait for this response.
     * @param timeout Timeout in milliseconds.
     */
    //% blockHidden=true
    //% blockId=vdr_esp8266_send_command
    export function VDRsendCommand(command: string, expected_response: string = null, timeout: number = 100): boolean {
        // Wait a while from previous command.
        basic.pause(10)

        // Flush the Rx buffer.
        serial.readString()
        VDRrxData = ""

        // Send the command and end with "\r\n".
        serial.writeString(command + "\r\n")

        // Don't check if expected response is not specified.
        if (expected_response == null) {
            return true
        }

        // Wait and verify the response.
        let result = false
        let timestamp = input.runningTime()
        while (true) {
            // Timeout.
            if (input.runningTime() - timestamp > timeout) {
                result = false
                break
            }

            // Read until the end of the line.
            VDRrxData += serial.readString()
            if (VDRrxData.includes("\r\n")) {
                // Check if expected response received.
                if (VDRrxData.slice(0, VDRrxData.indexOf("\r\n")).includes(expected_response)) {
                    result = true
                    break
                }

                // If we expected "OK" but "ERROR" is received, do not wait for timeout.
                if (expected_response == "OK") {
                    if (VDRrxData.slice(0, VDRrxData.indexOf("\r\n")).includes("ERROR")) {
                        result = false
                        break
                    }
                }

                // Trim the Rx data before loop again.
                VDRrxData = VDRrxData.slice(VDRrxData.indexOf("\r\n") + 2)
            }
        }

        return result
    }



    /**
     * Get the specific response from ESP8266.
     * Return the line start with the specific response.
     * @param command The specific response we want to get.
     * @param timeout Timeout in milliseconds.
     */
    //% blockHidden=true
    //% blockId=vdr_esp8266_get_response
    export function VDRgetResponse(response: string, timeout: number = 100): string {
        let responseLine = ""
        let timestamp2 = input.runningTime()
        while (true) {
            // Timeout.
            if (input.runningTime() - timestamp2 > timeout) {
                // Check if expected response received in case no CRLF received.
                if (VDRrxData.includes(response)) {
                    responseLine = VDRrxData
                }
                break
            }

            // Read until the end of the line.
            VDRrxData += serial.readString()
            if (VDRrxData.includes("\r\n")) {
                // Check if expected response received.
                if (VDRrxData.slice(0, VDRrxData.indexOf("\r\n")).includes(response)) {
                    responseLine = VDRrxData.slice(0, VDRrxData.indexOf("\r\n"))

                    // Trim the Rx data for next call.
                    VDRrxData = VDRrxData.slice(VDRrxData.indexOf("\r\n") + 2)
                    break
                }

                // Trim the Rx data before loop again.
                VDRrxData = VDRrxData.slice(VDRrxData.indexOf("\r\n") + 2)
            }
        }

        return responseLine
    }



    /**
     * Format the encoding of special characters in the url.
     * @param url The url that we want to format.
     */
    //% blockHidden=true
    //% blockId=VDResp8266_format_url
    export function VDRformatUrl(url: string): string {
        url = url.replaceAll("%", "%25")
        url = url.replaceAll(" ", "%20")
        url = url.replaceAll("!", "%21")
        url = url.replaceAll("\"", "%22")
        url = url.replaceAll("#", "%23")
        url = url.replaceAll("$", "%24")
        url = url.replaceAll("&", "%26")
        url = url.replaceAll("'", "%27")
        url = url.replaceAll("(", "%28")
        url = url.replaceAll(")", "%29")
        url = url.replaceAll("*", "%2A")
        url = url.replaceAll("+", "%2B")
        url = url.replaceAll(",", "%2C")
        url = url.replaceAll("-", "%2D")
        url = url.replaceAll(".", "%2E")
        url = url.replaceAll("/", "%2F")
        url = url.replaceAll(":", "%3A")
        url = url.replaceAll(";", "%3B")
        url = url.replaceAll("<", "%3C")
        url = url.replaceAll("=", "%3D")
        url = url.replaceAll(">", "%3E")
        url = url.replaceAll("?", "%3F")
        url = url.replaceAll("@", "%40")
        url = url.replaceAll("[", "%5B")
        url = url.replaceAll("\\", "%5C")
        url = url.replaceAll("]", "%5D")
        url = url.replaceAll("^", "%5E")
        url = url.replaceAll("_", "%5F")
        url = url.replaceAll("`", "%60")
        url = url.replaceAll("{", "%7B")
        url = url.replaceAll("|", "%7C")
        url = url.replaceAll("}", "%7D")
        url = url.replaceAll("~", "%7E")
        return url
    }



    /**
     * Return true if the ESP8266 is already initialized.
     */
    //% weight=30
    //% blockGap=8
    //% blockId=vdr_esp8266_is_esp8266_initialized
    //% block="ESP8266 initialized"
    export function isVDRESP8266Initialized(): boolean {
        return VDResp8266Initialized
    }



    /**
     * Initialize the ESP8266.
     * @param tx Tx pin of micro:bit. eg: SerialPin.P16
     * @param rx Rx pin of micro:bit. eg: SerialPin.P15
     * @param baudrate UART baudrate. eg: BaudRate.BaudRate115200
     */
    //% weight=29
    //% blockGap=40
    //% blockId=vdr_esp8266_init
    //% block="initialize ESP8266: Tx %tx Rx %rx Baudrate %baudrate"
    export function VDRinit(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        // Redirect the serial port.
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)

        // Reset the flag.
        VDResp8266Initialized = false

        // Restore the ESP8266 factory settings.
        if (VDRsendCommand("AT+RESTORE", "ready", 5000) == false) return

        // Turn off echo.
        if (VDRsendCommand("ATE0", "OK") == false) return

        // Initialized successfully.
        // Set the flag.
        VDResp8266Initialized = true
    }



    /**
     * Return true if the ESP8266 is connected to WiFi router.
     */
    //% weight=28
    //% blockGap=8
    //% blockId=vdr_esp8266_is_wifi_connected
    //% block="WiFi connected"
    export function isVDRWifiConnected(): boolean {
        // Get the connection status.
        VDRsendCommand("AT+CIPSTATUS")
        let status = VDRgetResponse("STATUS:", 1000)

        // Wait until OK is received.
        VDRgetResponse("OK")

        // Return the WiFi status.
        if ((status == "") || status.includes("STATUS:5")) {
            return false
        }
        else {
            return true
        }
    }



    /**
     * Connect to WiFi router.
     * @param ssid Your WiFi SSID.
     * @param password Your WiFi password.
     */
    //% weight=27
    //% blockGap=40
    //% blockId=vdr_esp8266_connect_wifi
    //% block="connect to WiFi: SSID %ssid Password %password"
    export function VDRconnectWiFi(ssid: string, password: string) {
        // Set to station mode.
        VDRsendCommand("AT+CWMODE=1", "OK")

        // Connect to WiFi router.
        VDRsendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 20000)
    }


    // Flag to indicate whether the data was uploaded to ThingSpeak successfully.
    let VDRdatasUploaded = false



    //% weight=26
    //% blockGap=8
    //% blockId=vdr_esp8266_is_datas_uploaded
    //% block="Donnée envoyée"
    export function isChronoVDRdatasUploaded(): boolean {
        return VDRdatasUploaded
    }

    //% weight=25
    //% blockGap=8
    //% blockId=vdr_esp8266_datas_upload
    //% block="Connecter au serveur : Serveur %server Port %port Url %url"
    export function VDRuploadDatas(server: string,
        port: string,
        url: string) {

        // Reset the upload successful flag.
        VDRdatasUploaded = false

        // Make sure the WiFi is connected.
        if (isVDRWifiConnected() == false) return

        // Connect to the serveur
        if (VDRsendCommand("AT+CIPSTART=\"TCP\",\"" + server + "\"," + port, "OK", 10000) == false) return

        // Construct the data to send.

        let data = "GET " + url;

        // Send the data.
        VDRsendCommand("AT+CIPSEND=" + (data.length + 2))
        VDRsendCommand(data)

        // Return if "SEND OK" is not received.
        if (VDRgetResponse("SEND OK", 1000) == "") return

        // Check the response from ThingSpeak.
        let response = VDRgetResponse("+IPD", 1000)
        if (response == "") return

        // Trim the response to get the upload count.
        response = response.slice(response.indexOf(":") + 1, response.indexOf("CLOSED"))
        let uploadCount = parseInt(response)

        // Return if upload count is 0.
        if (uploadCount == 0) return

        // Set the upload successful flag and return.
        VDRdatasUploaded = true
        return

    }
}
