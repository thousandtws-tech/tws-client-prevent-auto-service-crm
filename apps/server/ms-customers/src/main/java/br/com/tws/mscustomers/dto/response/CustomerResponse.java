package br.com.tws.mscustomers.dto.response;

import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class CustomerResponse {

    Long id;
    String nomeCompleto;
    String telefone;
    String cpfCnpj;
    String email;
    String endereco;
    String cep;
    String logradouro;
    String numero;
    String complemento;
    String bairro;
    String cidade;
    String uf;
    OffsetDateTime createdAt;
    OffsetDateTime updatedAt;
}
