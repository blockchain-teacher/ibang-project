`use strict`;

const adminUserId = 'admin';

exports.buildCAClient = (FabricCAServices, ccp, caHostName) => {
    const caInfo = ccp.certificateAuthorities[caHostName];
    const caTLSCAcerts = caInfo.tlsCACerts.pem;
    const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCAcerts, verify: false }, caInfo.caName);

    console.log(`Built a CA Client named ${caInfo.caName}`);

    return caClient;
}

exports.enrollAdmin = async (caClient, wallet, orgMspId, adminId, adminPw) => {
    try {
        console.log(caClient, wallet, orgMspId, adminId, adminPw)
        if (adminId != adminUserId) {
            // throw admin id error
            throw new Error('Admin ID is not match.');
            return;
        }

        const identity = await wallet.get(adminUserId);
        if (identity) {
            console.log("An identity for the admin user already exists in the wallet");
            throw new Error("An identity for the admin user already exists in the wallet");
            return;
        }

        const enrollment = await caClient.enroll({ enrollmentID: adminId, enrollmentSecret: adminPw });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        await wallet.put(adminId, x509Identity);
        console.log('Successfully enrolled admin user and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user - ${error}`);
        //throw error;        
        throw new Error(`Failed to enroll admin user - ${error}`)
    }
}

exports.registerAndEnrollUser = async (caClient, wallet, orgMspId/*Org1MSP*/ , userId, affiliation) => {
    try {
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`An identity for the user ${userId} already exists in the wallet`);
            throw new Error(`An identity for the user ${userId} already exists in the wallet`);
            return;
        }

        const adminIdentity = await wallet.get(adminUserId);
        if (!adminIdentity) {
            console.log('An identity for the admin user does not exist in the wallet');
            throw new Error('An identity for the admin user does not exist in the wallet');
            return;
        }
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

        const secret = await caClient.register({
            affiliation: affiliation,
            enrollmentID: userId,
            role: 'client'
        }, adminUser);

        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        console.log(orgMspId); //Org1MSP
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        
        await wallet.put(userId, x509Identity);
        console.log(`Successfully registered and enrolled user ${userId}`);

    } catch (error) {
        console.error(`Failed to register user - ${error}`);
        throw new Error(`Failed to register user - ${error}`);
    }
};