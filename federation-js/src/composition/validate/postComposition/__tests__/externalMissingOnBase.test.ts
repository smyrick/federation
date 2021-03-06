import gql from 'graphql-tag';
import { composeServices } from '../../../compose';
import { externalMissingOnBase as validateExternalMissingOnBase } from '../';
import { graphqlErrorSerializer } from 'apollo-federation-integration-testsuite';

expect.addSnapshotSerializer(graphqlErrorSerializer);

describe('externalMissingOnBase', () => {
  it('warns when an @external field does not have a matching field on the base type', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "sku") {
          sku: String!
          upc: String!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product @key(fields: "sku") {
          sku: String! @external
          id: String! @external
          price: Int! @requires(fields: "sku id")
        }
      `,
      name: 'serviceB',
    };

    const serviceC = {
      typeDefs: gql`
        extend type Product @key(fields: "sku") {
          sku: String! @external
          id: String!
          test: Int @external
        }
      `,
      name: 'serviceC',
    };

    const serviceList = [serviceA, serviceB, serviceC];
    const { schema } = composeServices([serviceA, serviceB, serviceC]);
    const warnings = validateExternalMissingOnBase({ schema, serviceList });
    expect(warnings).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "EXTERNAL_MISSING_ON_BASE",
          "message": "[serviceB] Product.id -> marked @external but id was defined in serviceC, not in the service that owns Product (serviceA)",
        },
        Object {
          "code": "EXTERNAL_MISSING_ON_BASE",
          "message": "[serviceC] Product.test -> marked @external but test is not defined on the base service of Product (serviceA)",
        },
      ]
    `);
  });

  it("warns when an @external field isn't defined anywhere else", () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "sku") {
          sku: String!
          upc: String!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product {
          specialId: String! @external
          id: String! @requires(fields: "specialId")
        }
      `,
      name: 'serviceB',
    };

    const serviceList = [serviceA, serviceB];
    const { schema } = composeServices(serviceList);
    const warnings = validateExternalMissingOnBase({ schema, serviceList });
    expect(warnings).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "EXTERNAL_MISSING_ON_BASE",
          "message": "[serviceB] Product.specialId -> marked @external but specialId is not defined on the base service of Product (serviceA)",
        },
      ]
    `);
  });
});
