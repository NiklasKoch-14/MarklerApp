package com.marklerapp.crm.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklerapp.crm.dto.UpdatePropertyRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Das Objekt-Formular sendet ungefuellte Felder als "" -- fuer Enums deckt das
 * {@link JacksonConfig} bereits ab. Die Auftragsfelder (Issue #39) bringen mit
 * mandateStart/mandateEnd erstmals Datumsfelder in eine Maske, die man realistisch
 * leer laesst, also muss "" auch dort als null ankommen statt als 400.
 */
@SpringBootTest
class EmptyDateCoercionTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void emptyStringForMandateDates_DeserializesToNull() throws Exception {
        String json = """
            {
              "mandateType": "",
              "mandateStart": "",
              "mandateEnd": "",
              "availableFrom": ""
            }
            """;

        UpdatePropertyRequest request = objectMapper.readValue(json, UpdatePropertyRequest.class);

        assertThat(request.getMandateType()).isNull();
        assertThat(request.getMandateStart()).isNull();
        assertThat(request.getMandateEnd()).isNull();
        assertThat(request.getAvailableFrom()).isNull();
    }

    @Test
    void filledMandateDates_StillParse() {
        String json = """
            {
              "mandateType": "EXCLUSIVE",
              "mandateStart": "2026-01-15",
              "mandateEnd": "2026-07-15"
            }
            """;

        assertThatCode(() -> {
            UpdatePropertyRequest request = objectMapper.readValue(json, UpdatePropertyRequest.class);
            assertThat(request.getMandateStart().toString()).isEqualTo("2026-01-15");
            assertThat(request.getMandateEnd().toString()).isEqualTo("2026-07-15");
        }).doesNotThrowAnyException();
    }
}
