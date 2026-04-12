// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProofOfOwnership {

    struct Content {
        address owner;
        string ipfsCID;
        uint256 timestamp;
    }

    mapping(string => Content) private contents;

    event ContentRegistered(
        string hash,
        address owner,
        string ipfsCID,
        uint256 timestamp
    );

    function registerContent(string memory hash, string memory ipfsCID) public {
        require(contents[hash].owner == address(0), "Already registered");

        contents[hash] = Content({
            owner: msg.sender,
            ipfsCID: ipfsCID,
            timestamp: block.timestamp
        });

        emit ContentRegistered(hash, msg.sender, ipfsCID, block.timestamp);
    }

    function verifyOwnership(string memory hash)
        public
        view
        returns (address owner, string memory ipfsCID, uint256 timestamp)
    {
        require(contents[hash].owner != address(0), "Not found");

        Content memory c = contents[hash];
        return (c.owner, c.ipfsCID, c.timestamp);
    }
}