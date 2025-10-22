const roles = {
    GROSSISTE: {
        name: "Tarif Grossiste",
        password: "Grossiste ^rq%oh@$423N6VJaa*r4Q8",
        downloadLink: "/login/download_grossiste.html"
    },
    HEXAPAGE: {
        name: "Tarif Hexapage",
        password: "Hexapage Lbez$2H5Bz9s#T6!KK!$LZ",
        downloadLink: "/login/download_hexapage.html"
    },
    KOESIO: {
        name: "Tarif Koesio",
        password: "Koesiohc 9ATjGT!!yowsazkmLA$t",
        downloadLink: "/login/download_koesio.html"
    },
    KYOXPERT: {
        name: "Tarif KYOXpert",
        password: "KYOXPERT 5pZ@2DZKJ!tTPiSBDdSNCg",
        downloadLink: "/login/download_kyoxpert.html"
    },
    PUBLIC: {
        name: "Tarif public",
        password: "Public *@9Yj6Sfs*7gV2CX*ZAU5n",
        downloadLink: "/login/download_public.html"
    }
};

function getRole(roleKey) {
    return roles[roleKey] || null;
}

function isValidPassword(roleKey, password) {
    const role = getRole(roleKey);
    return role && role.password === password;
}

export { roles, getRole, isValidPassword };