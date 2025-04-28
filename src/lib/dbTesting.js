'use strict';

import { DynamoDB, CognitoIdentityServiceProvider } from 'aws-sdk';

const db = new DynamoDB.DocumentClient({ region: 'ap-south-1' });
const cognito = new CognitoIdentityServiceProvider();
const TABLE_NAME = process.env.ORGANIZATION_TABLE;
const USER_POOL_ID = process.env.USER_POOL_ID;

/**
 * Fetches organization details from DynamoDB.
 * If missing, restores data from Cognito.
 */
export async function GetOrgDetails(req, res) {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ message: 'orgId is required' });

  const params = {
    TableName: TABLE_NAME,
    Key: { pk: orgId, sk: 'profile' }, // Fetch profile
  };

  try {
    // 1️⃣ Fetch from DynamoDB
    const result = await db.get(params).promise();

    if (result.Item) {
      console.log('✅ Found in DynamoDB:', result.Item);
      return res.status(200).json(result.Item);
    }

    console.log('⚠️ Not found in DynamoDB, checking Cognito...');

    // 2️⃣ Fetch from Cognito
    const orgDetails = await fetchOrgFromCognito(orgId);

    if (!orgDetails) {
      return res.status(404).json({ message: 'Organization not found in Cognito either!' });
    }

    // 3️⃣ Restore Data in DynamoDB
    await restoreOrgData(orgDetails);

    return res.status(200).json(orgDetails);
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ message: 'Error', error: error.message });
  }
}

async function fetchOrgFromCognito(username) {
    try {
      const params = {
        USER_POOL_ID: process.env.USER_POOL_ID,
        Username: username,
      };
  
      const response = await cognito.adminGetUser(params).promise();
  
      console.log("✅ Full Cognito Response:", JSON.stringify(response, null, 2));
  
      if (!response || !response.UserAttributes) {
        console.log("❌ No attributes found in Cognito!");
        return null;
      }
  
      const attributes = response.UserAttributes.reduce((acc, attr) => {
        acc[attr.Name] = attr.Value;
        return acc;
      }, {});
  
      return {
        orgId: attributes["custom:orgid"] || username,
        orgName: attributes["custom:orgName"] || "Unknown Org",
        email: attributes["email"] || "No Email",
        isNewClient: attributes["custom:is_New_Client"] || "Unknown",
      };
    } catch (error) {
      console.error("❌ Error fetching from Cognito:", error.message);
      return null;
    }
  }
  
  

  async function restoreOrgData(orgDetails) {
    if (!orgDetails || !orgDetails.orgId) {
      console.log("⚠️ No valid data available to restore.");
      return;
    }
  
    const params = {
      TableName: process.env.ORGANIZATION_TABLE,
      Item: {
        pk: orgDetails.orgId,
        sk: "profile",
        orgName: orgDetails.orgName,
        email: orgDetails.email,
        isNewClient: orgDetails.isNewClient,
        restoredAt: new Date().toISOString(),
      },
    };
  
    try {
      await db.put(params).promise();
      console.log("✅ Successfully restored to DynamoDB:", orgDetails.orgId);
    } catch (error) {
      console.error("❌ Error restoring organization:", error.message);
    }
  }
  