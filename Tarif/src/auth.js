function authenticateUser(role, password) {
    const credentials = {
        'Tarif Grossiste': 'Grossiste ^rq%oh@$423N6VJaa*r4Q8',
        'Tarif Hexapage': 'Hexapage Lbez$2H5Bz9s#T6!KK!$LZ',
        'Tarif Koesio': 'Koesiohc 9ATjGT!!yowsazkmLA$t',
        'Tarif KYOXpert': 'KYOXPERT 5pZ@2DZKJ!tTPiSBDdSNCg',
        'Tarif public': 'Public *@9Yj6Sfs*7gV2CX*ZAU5n'
    };

    if (credentials[role] && credentials[role] === password) {
        sessionStorage.setItem('userRole', role);
        redirectToDownloadPage(role);
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

function redirectToDownloadPage(role) {
    switch (role) {
        case 'Tarif Grossiste':
            window.location.href = '/login/download_grossiste.html';
            break;
        case 'Tarif Hexapage':
            window.location.href = '/login/download_hexapage.html';
            break;
        case 'Tarif Koesio':
            window.location.href = '/login/download_koesio.html';
            break;
        case 'Tarif KYOXpert':
            window.location.href = '/login/download_kyoxpert.html';
            break;
        case 'Tarif public':
            window.location.href = '/login/download_public.html';
            break;
        default:
            alert('Role not recognized.');
    }
}

function checkAccess(expectedRole) {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== expectedRole) {
        alert('Accès refusé. Veuillez vous connecter.');
        window.location.href = '/login/login_page/index.html';
    }
}