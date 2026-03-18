package br.com.tws.mscustomers.domain.model;

import lombok.Builder;

@Builder
public record CustomerCommand(
        String nomeCompleto,
        String telefone,
        String cpfCnpj,
        String email,
        String endereco,
        String cep,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf
) {
}
